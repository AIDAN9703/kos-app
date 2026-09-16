import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.isAdmin === true;

  // Protect admin routes — require auth + admin role
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", callbackUrlFromRequest(req));
      return NextResponse.redirect(signInUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/403", req.url));
    }
  }

  // Profile — require auth
  if (pathname.startsWith("/profile")) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", callbackUrlFromRequest(req));
      return NextResponse.redirect(signInUrl);
    }
  }

  // Bookings — require auth except guest checkout / public booking URLs
  if (pathname.startsWith("/bookings")) {
    if (!isLoggedIn && !isPublicGuestBookingPath(pathname)) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", callbackUrlFromRequest(req));
      return NextResponse.redirect(signInUrl);
    }
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (!isLoggedIn)
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Protect upload API
  if (pathname.startsWith("/api/upload")) {
    if (!isLoggedIn)
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhook|api/auth|api/boats/[^/]+/availability|api/boats/[^/]+/calendar|api/users/[^/]+$).*)",
  ],
};
