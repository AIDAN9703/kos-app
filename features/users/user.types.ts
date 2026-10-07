import type { BookingStatus, CaptainStatus, CrewStatus, User } from "@/database/types";
import type { Role } from "@/shared/lib/auth/permissions";

/** One row of the admin people list. */
export type UserListItem = Pick<
  User,
  "id" | "email" | "firstName" | "lastName" | "profileImage" | "role" | "phoneNumber" | "emailVerified" | "banned" | "createdAt"
>;

/** A person in the account pickers (booking composer, boat owner). */
export type UserOption = Pick<
  User,
  "id" | "firstName" | "lastName" | "email" | "phoneNumber" | "profileImage" | "username"
>;

/** A booking as listed on a person's page (their trips, or deals assigned to them). */
export interface UserBookingRow {
  id: string;
  status: BookingStatus;
  customerName: string;
  boatName: string | null;
  startDateTime: Date | null;
  totalAmountCents: number | null;
  currency: string | null;
}

/** Everything the admin person page shows. */
export interface AdminUserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  profileImage: string | null;
  roles: Role[];
  deactivated: boolean;
  createdAt: Date;
  stripeCustomerId: string | null;
  /** "credential" (email + password), "google", … */
  signInMethods: string[];
  captainStatus: CaptainStatus | null;
  crewStatus: CrewStatus | null;
  /** Bookings they made as a customer (newest first). */
  trips: UserBookingRow[];
  /** Deals assigned to them (staff). */
  assignedDeals: UserBookingRow[];
  /** Boats they own. */
  boats: { id: string; name: string; active: boolean }[];
  /** Nothing in the records points at them, so they can be deleted outright. */
  canDelete: boolean;
}

export interface PaginatedUsersResponse {
  users: UserListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
