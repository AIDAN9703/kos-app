import { NextRequest } from "next/server";
import { boatService } from "@/features/boats/boat.service";
import { apiSuccess, apiError } from "@/shared/lib/utils/api-helpers";
import { requirePermission } from "@/shared/lib/utils/auth-utils";

/**
 * GET /api/admin/boats/list
 * Boats for admin dropdowns (BoatSelect, the booking composer).
 * Query params: search (optional, min 2 chars) - filters by name, make, model, location.
 * Returns BoatForAdminSelect format.
 */
export async function GET(request: NextRequest) {
  try {
    // Read-only: brokers see boats to price their deals.
    const access = await requirePermission({ boat: ["view"] });
    if (access.error !== undefined) return apiError(access.error, 403);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;

    const boats = await boatService.getBoatsForAdminSelect(search);
    return apiSuccess(boats);
  } catch (error) {
    console.error("Error fetching boats list:", error);
    return apiError("Failed to fetch boats list");
  }
}

