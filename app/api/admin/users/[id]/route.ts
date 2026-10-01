import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { userService } from "@/features/users/user.service";
import { apiSuccess, apiError } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/users/[id]
 * Fetch single user by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Admin authentication
    const session = await auth();
    if (!session?.user || !session.user.isAdmin) {
      return apiError("Admin access required", 403);
    }

    const user = await userService.getUserById(id);

    if (!user) {
      return apiError("User not found", 404);
    }

    return apiSuccess(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return apiError("Failed to fetch user");
  }
}

