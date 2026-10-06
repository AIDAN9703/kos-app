import { NextRequest } from "next/server";
import { getBoatForPicker } from "@/features/boats/boat.data";
import { apiSuccess, apiError, apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/boats/[id]
 * One boat in the staff picker shape (shows the current selection).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const boat = await getBoatForPicker(id);
    if (!boat) return apiError("Boat not found", 404);
    return apiSuccess(boat);
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch boat");
  }
}
