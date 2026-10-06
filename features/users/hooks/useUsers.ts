import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../user.api";

/**
 * People matching a search (the account picker)
 */
export function useUsers(search?: string) {
  return useQuery({
    queryKey: ['users', 'options', search ?? ''],
    queryFn: () => usersApi.searchUsers(search),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

/**
 * Fetch single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => usersApi.getUser(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch list of boat owners (for owner selection dropdowns)
 */
export function useBoatOwners(search?: string) {
  return useQuery({
    queryKey: ['users', 'boat-owners', search],
    queryFn: () => usersApi.getBoatOwners(search),
    enabled: !search || search.length >= 2, // Only search if 2+ characters
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter since it's search-based)
  });
}
