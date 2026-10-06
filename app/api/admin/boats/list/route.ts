import { NextRequest } from "next/server";
import { boatService } from "@/features/boats/boat.service";
import { apiSuccess, apiError } from "@/shared/lib/utils/api-helpers";
import { getSession } from "@/shared/lib/utils/auth-utils";

/**
 * GET /api/admin/boats/list
 * Boats for admin dropdowns (BoatSelect, the booking composer).
 * Query params: search (optional, min 2 chars) - filters by name, make, model, location.
 * Returns BoatForAdminSelect format.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !session.user.isAdmin) {
      return apiError("Admin access required", 403);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;

    const boats = await boatService.getBoatsForAdminSelect(search);
    return apiSuccess(boats);
  } catch (error) {
    console.error("Error fetching boats list:", error);
    return apiError("Failed to fetch boats list");
  }
}

