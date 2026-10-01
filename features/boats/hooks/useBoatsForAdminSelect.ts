import { useQuery } from "@tanstack/react-query";
import { boatsApi } from "../boat.api";


/**
 * Fetch boats for admin select (searchable combobox).
 * Only fetches when search is 2+ chars, or when no search (initial load).
 */
export function useBoatsForAdminSelect(search?: string) {
  return useQuery({
    queryKey: ["boats", "admin-select", search ?? ""],
    queryFn: () => boatsApi.getBoatsForAdminSelect(search),
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single boat by ID (for displaying selected boat in BoatSelect)
 */
export function useBoatForAdminSelect(id: string) {
  return useQuery({
    queryKey: ["boats", "admin-select", "detail", id],
    queryFn: () => boatsApi.getBoat(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
