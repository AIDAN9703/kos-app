import { NextRequest, NextResponse } from "next/server";
import { getBusyWindows } from "@/features/availability/availability.data";
import { apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/boats/[id]/availability?startDate=...&endDate=...
 * When the boat is taken in a window — busy times only, nothing about who
 * or why (the booking form's time slots).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const search = request.nextUrl.searchParams;
    const busy = await getBusyWindows(id, search.get("startDate"), search.get("endDate"));
    return NextResponse.json({ conflicts: busy });
  } catch (error) {
    return apiErrorFrom(error, "Failed to check availability");
  }
}
