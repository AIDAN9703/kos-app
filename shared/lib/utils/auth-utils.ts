import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

/**
 * Authentication Utilities
 *
 * Centralized authentication helpers to reduce code duplication and ensure
 * consistent auth checks across the application.
 *
 * Note: Route-level protection is handled by proxy.ts (Next.js middleware entry).
 * These utilities are for:
 * - Getting session data in layouts/pages
 * - Role-based access control in pages
 * - Authentication checks in server actions
 */

/**
 * Require authentication and return the session
 *
 * Use this in pages when you need guaranteed authentication.
 * Throws/redirects if not authenticated (though middleware should catch this first).
 *
 * @returns Authenticated session (never null)
 * @throws Redirects to /sign-in if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return session;
}

/**
 * Require admin role
 *
 * Use this in admin pages to ensure user has admin access.
 * Redirects to /403 if not admin.
 *
 * @returns Authenticated admin session
 * @throws Redirects to /sign-in if not authenticated, /403 if not admin
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();

  if (!session.user.isAdmin) {
    redirect("/403");
  }

  return session;
}

/**
 * Require owner role
 *
 * Use this in owner-specific pages (the /owner portal).
 * Redirects to /profile if user is not an owner.
 *
 * @returns Authenticated owner session
 * @throws Redirects to /sign-in if not authenticated, /profile if not owner
 */
export async function requireOwner(): Promise<Session> {
  const session = await requireAuth();

  if (!session.user.isOwner) {
    redirect("/profile");
  }

  return session;
}

/**
 * Require captain role
 *
 * Use this in captain-specific pages (e.g., /profile/captain).
 * Redirects to /profile if user is not a captain.
 *
 * @returns Authenticated captain session
 * @throws Redirects to /sign-in if not authenticated, /profile if not captain
 */
export async function requireCaptain(): Promise<Session> {
  const session = await requireAuth();

  if (!session.user.isCaptain) {
    redirect("/profile");
  }

  return session;
}

/**
 * Get admin session for server actions
 *
 * Use this in server actions that require admin access.
 * Returns an error object instead of redirecting (server actions can't redirect).
 *
 * @returns Object with session if admin, or error if not
 */
export async function getAdminSession(): Promise<
  { session: Session; error?: never } | { session?: never; error: string }
> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Not authenticated" };
  }
  if (!session.user.isAdmin) {
    return { error: "Admin access required" };
  }

  return { session };
}

/**
 * Get authenticated user ID for server actions
 *
 * Use this in server actions when you need the user ID.
 * Returns an error object instead of redirecting (server actions can't redirect).
 *
 * @returns Object with userId if authenticated, or error if not
 */
export async function getAuthenticatedUserId(): Promise<
  { userId: string; error?: never } | { userId?: never; error: string }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  return { userId: session.user.id };
}
