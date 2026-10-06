import { NextRequest } from "next/server";
import { boatService } from "@/features/boats/boat.service";
import { apiSuccess, apiError } from "@/shared/lib/utils/api-helpers";
import { requirePermission } from "@/shared/lib/utils/auth-utils";

/**
 * GET /api/admin/boats/[id]/pricing-tiers
 * Fetch pricing tiers for a boat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Read-only: brokers see boats to price their deals.
    const access = await requirePermission({ boat: ["view"] });
    if (access.error !== undefined) return apiError(access.error, 403);

    const resolvedParams = await params;
    const tiers = await boatService.getBoatPricingTiers(resolvedParams.id);
    
    return apiSuccess(tiers);
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return apiError("Failed to fetch pricing tiers");
  }
}

