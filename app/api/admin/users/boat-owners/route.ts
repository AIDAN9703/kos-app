import { NextRequest } from "next/server";
import { ownerProfileService } from "@/features/profiles/owner-profile.service";
import { apiSuccess, apiError } from "@/shared/lib/utils/api-helpers";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";

/**
 * GET /api/admin/users/boat-owners
 * Get list of boat owners (for owner selection dropdowns)
 * Query param: search (optional) - filters by name, email, username
 */
export async function GET(request: NextRequest) {
  try {
    // Admin authentication
    const admin = await getAdminSession();
    if (admin.error !== undefined) {
      return apiError("Admin access required", 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;

    const owners = await ownerProfileService.getOwnersForAssignment(search);
    return apiSuccess(owners);
  } catch (error) {
    console.error("Error fetching boat owners:", error);
    return apiError("Failed to fetch boat owners");
  }
}


