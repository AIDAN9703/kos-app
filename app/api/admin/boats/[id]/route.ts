import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { boatService } from "@/features/boats/boat.service";
import { apiSuccess, apiError } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/boats/[id]
 * Fetch single boat by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Admin authentication
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
      return apiError("Admin access required", 403);
    }

    const boat = await boatService.getBoatById(id);

    if (!boat) {
      return apiError("Boat not found", 404);
    }

    return apiSuccess(boat);

  } catch (error) {
    console.error("Error fetching boat:", error);
    return apiError("Failed to fetch boat");
  }
}




