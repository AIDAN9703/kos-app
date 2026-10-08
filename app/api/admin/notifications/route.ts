import { getNotifications } from "@/features/admin/dashboard.data";
import { apiErrorFrom, apiSuccess } from "@/shared/lib/utils/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notifications
 * The top bar's bell (admins): the dashboard's action queue, summarized.
 */
export async function GET() {
  try {
    return apiSuccess(await getNotifications());
  } catch (error) {
    return apiErrorFrom(error, "Failed to load notifications");
  }
}
