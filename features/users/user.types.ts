/**
 * User-related application types
 *
 * TYPE ORGANIZATION:
 * - Base types imported from @/database/types (single source of truth)
 * - Derived types created here for application-specific needs
 * - Relation types match what userService.getUserById() returns
 *
 * IMPORT CONVENTIONS:
 * - Always import base User type from @/database/types
 * - Derive application types using Pick, Omit, or intersection types
 * - Keep relation types aligned with service layer return types
 */

import type {
  User,
  Boat,
  CaptainProfile,
  CrewProfile,
  OwnerProfile,
  Notification,
  CaptainStatus,
  CrewStatus,
} from "@/database/types";
import type { BookingListItemShared } from "@/shared/lib/types/booking-shared.types";

/**
 * Re-export base types for convenience
 */
export type { User, UserStatus } from "@/database/types";

// ========================================
// DERIVED USER TYPES
// ========================================

/**
 * User list item - minimal data for admin tables and lists
 * Optimized for table display with essential fields only
 */
export type UserListItem = Pick<
  User,
  | "id"
  | "email"
  | "username"
  | "firstName"
  | "lastName"
  | "profileImage"
  | "role"
  | "phoneNumber"
  | "emailVerified"
  | "createdAt"
  | "updatedAt"
> & {
  captainProfileStatus: CaptainStatus | null;
  crewProfileStatus: CrewStatus | null;
};

/**
 * @example
 * // Basic user (no relations)
 * const user = await userService.getUserById(id);
 * // Type: User | null
 *
 * @example
 * // User with relations
 * const user = await userService.getUserById(id, {
 *   ownedBoats: { limit: 10 },
 *   captainProfile: true,
 *   bookings: { limit: 5 }
 * });
 * // Type: UserWithRelations | null
 */
export type UserWithRelations = User & {
  /** Boats owned by this user (limited fields for list views) */
  ownedBoats?: Array<
    Pick<Boat, "id" | "name" | "category" | "active" | "featured" | "mainImage" | "createdAt">
  >;

  /** Captain profile if user is a captain (columns match getUserById `captainProfile: true`) */
  captainProfile?: Pick<CaptainProfile, "userId" | "status" | "uscgLicensed"> | null;

  /** Crew profile if user is crew (columns match getUserById `crewProfile: true`) */
  crewProfile?: Pick<CrewProfile, "userId" | "status"> | null;

  /** Owner profile if user is an owner */
  ownerProfile?: Pick<
    OwnerProfile,
    | "userId"
    | "businessType"
    | "businessName"
    | "totalBoatsListed"
    | "activeBoatsCount"
    | "totalBookings"
    | "stripeConnectOnboarded"
    | "payoutsEnabled"
    | "adminNotes"
  > | null;

  /** User's bookings (minimal data for list views) */
  bookings?: BookingListItemShared[];

  /** Reviews written by this user */

  /** User's notifications */
  notifications?: Array<
    Pick<Notification, "id" | "type" | "title" | "body" | "status" | "readAt" | "createdAt">
  >;
};

export interface PaginatedUsersResponse {
  users: UserListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
