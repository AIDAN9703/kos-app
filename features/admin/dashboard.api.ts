/**
 * Dashboard API client: the top bar's notifications, via an API route
 * (react-query). superjson keeps the items' dates as Dates.
 */

import superjson from "superjson";
import type { Notifications } from "@/features/admin/dashboard.types";
import type { ApiResponse } from "@/shared/lib/types/api.types";

export const dashboardApi = {
  /** Calls: GET /api/admin/notifications */
  async getNotifications(): Promise<Notifications> {
    const response = await fetch("/api/admin/notifications");
    if (!response.ok) throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    const parsed = superjson.deserialize<ApiResponse<Notifications>>(await response.json());
    if (!parsed.success || parsed.data === undefined) throw new Error(parsed.error || "Failed to fetch notifications");
    return parsed.data;
  },
};
