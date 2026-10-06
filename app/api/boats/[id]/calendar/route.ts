import { NextRequest, NextResponse } from "next/server";
import { getMonthCalendar } from "@/features/availability/availability.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/boats/[id]/calendar?month=YYYY-MM
 * Day statuses for the booking calendar.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const month = request.nextUrl.searchParams.get("month");
    const days = await getMonthCalendar(id, month);
    return NextResponse.json({
      month,
      days: days.map((day) => ({
        date: day.date.toISOString(),
        status: day.status,
        conflictCount: day.conflictCount,
      })),
    });
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch calendar availability");
  }
}
