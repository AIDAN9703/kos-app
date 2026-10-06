import { NextRequest } from "next/server";
import { getBoatsForPicker } from "@/features/boats/boat.data";
import { apiSuccess, apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/boats/list
 * Boats for the staff pickers (BoatSelect, the booking composer).
 * Query params: search (optional, min 2 chars) - filters by name, make, model, location.
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
    return apiSuccess(await getBoatsForPicker(search));
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch boats list");
  }
}
