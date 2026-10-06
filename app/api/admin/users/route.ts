import { NextRequest } from "next/server";
import { searchUserOptions } from "@/features/users/user.data";
import { apiSuccess, apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/users?search=...
 * People for the account picker (admins).
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
    return apiSuccess(await searchUserOptions(search));
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch users");
  }
}
