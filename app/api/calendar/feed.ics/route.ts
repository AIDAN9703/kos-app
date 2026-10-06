/**
 * Public iCal feed for KOS bookings.
 *
 * URL: /api/calendar/feed.ics?token=<hmac>&scope=bookings&boatId=...|captainId=...|ownerId=...
 *
 * Auth model:
 * - No user session — this endpoint is meant to be subscribed to from external
 *   calendars (Google Calendar “Add by URL”, Apple Calendar, Outlook).
 * - Access is gated by an HMAC token derived from the filter combination plus
 *   `CALENDAR_FEED_SECRET` (see `shared/lib/calendar/feed-tokens.ts`).
 * - Only bookings the URL is scoped to are returned — boatId, captainId, or
 *   boat-ownership (ownerId). At least one of those must be present.
 *
 * Returned events are BOOKED trips only, to keep external calendars clean.
 * Owner feeds leave out customer contact details (see availability.data.ts).
 */

import { NextRequest, NextResponse } from "next/server";

import { getCalendarFeed } from "@/features/availability/availability.data";
import { buildIcs } from "@/shared/lib/calendar/ics";
import { UserFacingError } from "@/shared/lib/errors";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = url.searchParams;
  try {
    const feed = await getCalendarFeed({
      scope: params.get("scope"),
      boatId: params.get("boatId") || undefined,
      captainId: params.get("captainId") || undefined,
      ownerId: params.get("ownerId") || undefined,
      token: params.get("token") || "",
      origin: url.origin,
    });
    return new NextResponse(buildIcs(feed.events, feed.name), {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "cache-control": "private, max-age=300", // 5 min — Google polls roughly hourly anyway
        "content-disposition": 'inline; filename="kos-bookings.ics"',
      },
    });
  } catch (error) {
    if (error instanceof UserFacingError) return new NextResponse(error.message, { status: error.status });
    console.error("[calendar/feed.ics]", error);
    return new NextResponse("Calendar feed not available", { status: 500 });
  }
}
