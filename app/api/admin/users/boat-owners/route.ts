import { NextRequest } from "next/server";
import { listBoatOwnerOptions } from "@/features/users/user.data";
import { apiSuccess, apiErrorFrom } from "@/shared/lib/utils/api-helpers";

/**
 * GET /api/admin/users/boat-owners?search=...
 * People with the Owner role, for the boat form's owner picker.
 */
export async function GET(request: NextRequest) {
  try {
    return apiSuccess(await listBoatOwnerOptions(request.nextUrl.searchParams.get("search") ?? undefined));
  } catch (error) {
    return apiErrorFrom(error, "Failed to fetch boat owners");
  }
}
