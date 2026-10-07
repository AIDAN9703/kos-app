import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/shared/lib/auth/auth";
import { AccessDenied } from "@/shared/lib/errors";
import { rolesCan, type PermissionRequest, type Role } from "@/shared/lib/auth/permissions";
import type { SessionUser } from "@/shared/lib/auth/session-user";

/**
 * The only way server code asks "who is signed in, and may they do this?".
 *
 * - Data layer (*.data.ts): assertSignedIn / assertCan throw AccessDenied.
 *   Every read and write that pages, routes and actions use goes through one.
 * - Pages and layouts: requireAuth / requireAdmin / requireBrokerPortal /
 *   requireOwner / requireCaptain (redirect when not allowed).
 *
 * proxy.ts only does a quick "is there a session cookie" redirect; the real
 * check is always one of these.
 */

export type { SessionUser };

interface AppSession {
  user: SessionUser;
  session: { id: string; expiresAt: Date; impersonatedBy?: string | null };
}

/** The current session, or null. Read once per request. */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const result = await auth.api.getSession({ headers: await headers() });
  return result ? { user: result.user, session: result.session } : null;
});

export function hasRole(user: SessionUser, role: Role): boolean {
  return user.roles.includes(role);
}

/** May this person do it? e.g. can(user, { booking: ["view-all"] }). */
export function can(user: SessionUser, request: PermissionRequest): boolean {
  return rolesCan(user.roles, request);
}

/** Data layer: the signed-in person, or AccessDenied (401) with this message. */
export async function assertSignedIn(message = "Not authenticated"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AccessDenied(message, 401);
  return session.user;
}

/** Data layer: a signed-in person allowed to do this, or AccessDenied. */
export async function assertCan(request: PermissionRequest): Promise<SessionUser> {
  const user = await assertSignedIn();
  if (!can(user, request)) throw new AccessDenied();
  return user;
}

/** Pages: the signed-in session, or a redirect to sign-in. */
export async function requireAuth(): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/** Admin pages. */
export async function requireAdmin(): Promise<AppSession> {
  const session = await requireAuth();
  if (!session.user.isAdmin) redirect("/403");
  return session;
}

/** The broker portal (/brokers). Admins may open it too. */
export async function requireBrokerPortal(): Promise<AppSession> {
  const session = await requireAuth();
  if (!session.user.isBroker && !session.user.isAdmin) redirect("/profile");
  return session;
}

/** The /owner portal. */
export async function requireOwner(): Promise<AppSession> {
  const session = await requireAuth();
  if (!session.user.isOwner) redirect("/profile");
  return session;
}

/** Captain pages (e.g. /profile/captain). */
export async function requireCaptain(): Promise<AppSession> {
  const session = await requireAuth();
  if (!session.user.isCaptain) redirect("/profile");
  return session;
}

