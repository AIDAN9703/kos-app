import { NextRequest } from "next/server";
import { getBoatTiers } from "@/features/boats/boat.data";
import { apiSuccess, apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/boats/[id]/pricing-tiers
 * A boat's active pricing tiers, to price a trip.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return apiSuccess(await getBoatTiers(id));
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch pricing tiers");
  }
}
