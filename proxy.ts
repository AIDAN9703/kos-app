import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/shared/lib/auth/auth";

/**
 * Route gate. Signed-in-only areas get a cheap "is there a session cookie"
 * check (no database). Admin areas get a real session + role check. Pages and
 * actions still verify for themselves through shared/lib/utils/auth-utils.ts;
 * this only saves a round trip for people who obviously aren't allowed.
 */

function redirectToSignIn(req: NextRequest) {
  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set("callbackUrl", callbackUrlFromRequest(req));
  return NextResponse.redirect(signInUrl);
}

/** Full path + query for safe return after sign-in (preserves booking nuqs, etc.). */
function callbackUrlFromRequest(req: NextRequest): string {
  const { pathname, search } = req.nextUrl;
  return `${pathname}${search || ""}`;
}

/**
 * Guest-accessible routes under /bookings (checkout before sign-in; modal auth on details page).
 * All other /bookings/* paths still require a session.
 */
function isPublicGuestBookingPath(pathname: string): boolean {
  // /bookings/:boatId/details — charter checkout (query string has dates / tier)
  if (/^\/bookings\/[^/]+\/details$/.test(pathname)) return true;
  // /bookings/:boatId/inquiry — non-instant boats redirect guests HERE from
  // /details; without this the whole public boat-lead funnel dead-ends at sign-in.
  if (/^\/bookings\/[^/]+\/inquiry$/.test(pathname)) return true;
  // Public proposal links (and the pre-2026-09 /draft/ address, which redirects)
  if (pathname.startsWith("/bookings/proposal/")) return true;
  if (pathname.startsWith("/bookings/draft/")) return true;
  // Stripe return URL
  if (pathname.startsWith("/bookings/payment-success")) return true;
  return false;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(req));

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  if (isAdminPage || isAdminApi) {
    const session = hasSessionCookie ? await auth.api.getSession({ headers: req.headers }) : null;
    if (!session) {
      return isAdminApi
        ? NextResponse.json({ error: "Authentication required" }, { status: 401 })
        : redirectToSignIn(req);
    }
    if (!session.user.isAdmin) {
      return isAdminApi
        ? NextResponse.json({ error: "Admin access required" }, { status: 403 })
        : NextResponse.redirect(new URL("/403", req.url));
    }
    return NextResponse.next();
  }

  // Customer profile and owner portal (role checks happen in the layouts)
  if (pathname.startsWith("/profile") || pathname === "/owner" || pathname.startsWith("/owner/")) {
    if (!hasSessionCookie) return redirectToSignIn(req);
  }

  // Bookings — require auth except guest checkout / public booking URLs
  if (pathname.startsWith("/bookings")) {
    if (!hasSessionCookie && !isPublicGuestBookingPath(pathname)) return redirectToSignIn(req);
  }

  // Protect upload API
  if (pathname.startsWith("/api/upload")) {
    if (!hasSessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhook|api/auth|api/boats/[^/]+/availability|api/boats/[^/]+/calendar).*)",
  ],
};
