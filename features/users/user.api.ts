/**
 * Users API Client
 * The account pickers' data, via API routes (react-query).
 */

import superjson from 'superjson';
import { type UserOption } from '@/features/users/user.types';
import { type ApiResponse } from '@/shared/lib/types/api.types';

async function getJson<T>(url: string, what: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${what}: ${response.statusText}`);
  const parsed = superjson.deserialize<ApiResponse<T>>(await response.json());
  if (!parsed.success || parsed.data === undefined) throw new Error(parsed.error || `Failed to fetch ${what}`);
  return parsed.data;
}

export const usersApi = {
  /**
   * People matching a search, for the account picker.
   * Calls: GET /api/admin/users?search=...
   */
  searchUsers(search?: string): Promise<UserOption[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    return getJson(`/api/admin/users?${params.toString()}`, 'users');
  },

  /**
   * One person, to show the current selection.
   * Calls: GET /api/admin/users/[id]
   */
  getUser(id: string): Promise<UserOption> {
    return getJson(`/api/admin/users/${id}`, 'user');
  },

  /**
   * People with the Owner role, for the boat form.
   * Calls: GET /api/admin/users/boat-owners?search=...
   */
  getBoatOwners(search?: string): Promise<Omit<UserOption, 'phoneNumber'>[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    return getJson(`/api/admin/users/boat-owners?${params.toString()}`, 'boat owners');
  },
};
