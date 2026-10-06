import { NextRequest, NextResponse } from "next/server";
import { getCalendarEvents } from "@/features/availability/availability.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/calendar-events?start=...&end=...&boatId=...
 * Booked trips and imported iCal blocks for the admin boat calendar.
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;
    return NextResponse.json(await getCalendarEvents(search.get("start"), search.get("end"), search.get("boatId")));
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch calendar events");
  }
}
