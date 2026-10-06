/**
 * Users API Client
 * Handles all data fetching via API routes
 */

import superjson from 'superjson';
import { type User } from '@/database/types';
import { type UserFilterInput } from '@/features/users/user.validation';
import { type UserListItem } from '@/features/users/user.types';
import { type ApiResponse, type PaginatedApiResponse } from '@/shared/lib/types/api.types';

export const usersApi = {
  // ========================================
  // ADMIN API FUNCTIONS
  // ========================================

  /**
   * Fetch users with filtering and pagination (Admin)
   * Calls: GET /api/admin/users
   */
  async getUsers(filters: UserFilterInput = {}): Promise<PaginatedApiResponse<UserListItem>> {
    const searchParams = new URLSearchParams();

    if (filters.search) searchParams.set('search', filters.search);
    if (filters.isAdmin !== undefined) searchParams.set('isAdmin', filters.isAdmin.toString());
    if (filters.page) searchParams.set('page', filters.page.toString());
    if (filters.limit) searchParams.set('limit', filters.limit.toString());

    const response = await fetch(`/api/admin/users?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const json = await response.json();
    return superjson.deserialize(json);
  },

  /**
   * Fetch single user by ID (Admin)
   * Calls: GET /api/admin/users/[id]
   */
  async getUser(id: string): Promise<User> {
    const response = await fetch(`/api/admin/users/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    const json = await response.json();
    const parsed = superjson.deserialize<ApiResponse<User>>(json);

    if (!parsed.success || !parsed.data) {
      throw new Error(parsed.error || 'Failed to fetch user');
    }

    return parsed.data;
  },

  // ========================================
  // FRONTEND API FUNCTIONS
  // ========================================

  /**
   * Get list of boat owners (for owner selection dropdowns)
   * Calls: GET /api/admin/users/boat-owners?search=query
   */
  async getBoatOwners(search?: string): Promise<Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    username: string;
    profileImage: string | null;
  }>> {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set('search', search);

    const response = await fetch(`/api/admin/users/boat-owners?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch boat owners: ${response.statusText}`);
    }

    const json = await response.json();
    const parsed = superjson.deserialize<ApiResponse<Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      username: string;
      profileImage: string | null;
    }>>>(json);

    if (!parsed.success || !parsed.data) {
      throw new Error(parsed.error || 'Failed to fetch boat owners');
    }

    return parsed.data;
  },
};
