import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../dashboard.api";

/**
 * The bell's data: refreshed every few minutes, when the window regains
 * focus, and whenever the bell opens (the caller refetches).
 */
export function useNotifications() {
  return useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: dashboardApi.getNotifications,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
