import { NextRequest } from "next/server";
import { userService } from "@/features/users/user.service";
import { userFilterSchema } from "@/features/users/user.validation";
import { apiPaginated, apiError } from "@/shared/lib/utils/api-helpers";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";

/**
 * GET /api/admin/users
 * Fetch paginated and filtered users list
 */
export async function GET(request: NextRequest) {
  try {
    // Admin authentication
    const admin = await getAdminSession();
    if (admin.error !== undefined) {
      return apiError("Admin access required", 403);
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Build raw filters object
    const rawFilters = {
      search: searchParams.get('search') || undefined,
      isAdmin: searchParams.get('isAdmin') === 'true' ? true : searchParams.get('isAdmin') === 'false' ? false : undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    // Validate filters with Zod
    const validation = userFilterSchema.safeParse(rawFilters);
    
    if (!validation.success) {
      return apiError(
        `Invalid filters: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      );
    }

    // Use validated filters
    const result = await userService.getAllUsers(validation.data);
    
    return apiPaginated(result.users, {
      page: result.page,
      limit: result.limit,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return apiError("Failed to fetch users");
  }
}

