import { NextRequest, NextResponse } from "next/server";
import { runScheduledCalendarSync } from "@/features/availability/availability.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

// node-ical relies on Node APIs; keep this off the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/calendar-sync
 * Vercel Cron (vercel.json): re-sync every enabled external calendar.
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await runScheduledCalendarSync(request.headers.get("authorization")));
  } catch (error) {
    return apiErrorFrom(error, "Calendar sync failed");
  }
}
