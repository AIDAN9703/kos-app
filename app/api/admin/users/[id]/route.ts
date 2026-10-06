import { NextRequest } from "next/server";
import { getUserOption } from "@/features/users/user.data";
import { apiSuccess, apiError, apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/users/[id]
 * One person in the picker shape (shows the current selection).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserOption(id);
    if (!user) return apiError("User not found", 404);
    return apiSuccess(user);
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch user");
  }
}
