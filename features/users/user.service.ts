import "server-only";

//drizzle
import { db } from '@/database/db';
import { claimGuestBookingsForUser } from '@/features/users/claim-guest-bookings.service';
import {
  users,
  captainProfiles,
  crewProfiles,
  bookings,
  bookingPricing,
} from '@/database/schema';
import { and, count, eq, desc, or, ilike, sql } from 'drizzle-orm';
import { resolveAdminListPagination } from '@/shared/admin/list-pagination';
import { type User   } from '@/database/types';

//types
import {
  type UserFilterInput,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/features/users/user.validation';
import {
  type PaginatedUsersResponse,
  type UserListItem,
  type UserOption,
  type UserWithRelations,
} from '@/features/users/user.types';

//auth
import { displayName } from '@/shared/lib/auth/session-user';
import { formatRoles, parseRoles } from '@/shared/lib/auth/permissions';
import { hasRoleSql, mergeAssignableRoles, setUserPassword, setUserRoles } from '@/features/users/user-access.service';
import { auth } from '@/shared/lib/auth/auth';
import { pgErrorCode, UserFacingError } from '@/shared/lib/errors';
import { headers } from 'next/headers';

const userOptionColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phoneNumber: users.phoneNumber,
  profileImage: users.profileImage,
  username: users.username,
};

/**
 * User queries. Server-only and not access-checked: pages, routes and
 * actions go through user.data.ts, which checks the admin permission first.
 */
export class UserService {
  /**
   * Get paginated and filtered users
   */
  async getAllUsers(filters?: UserFilterInput): Promise<PaginatedUsersResponse> {
    const { page, limit, offset } = resolveAdminListPagination(filters);

    const conditions = [];

    if (filters?.search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${filters.search}%`),
          ilike(users.lastName, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
          ilike(users.username, `%${filters.search}%`)
        )!
      );
    }

    if (filters?.isAdmin !== undefined) {
      const isAdmin = hasRoleSql("admin");
      conditions.push(filters.isAdmin ? isAdmin : sql`NOT (${isAdmin})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dataBase = db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImage: users.profileImage,
        role: users.role,
        phoneNumber: users.phoneNumber,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        captainProfileStatus: captainProfiles.status,
        crewProfileStatus: crewProfiles.status,
      })
      .from(users)
      .leftJoin(captainProfiles, eq(users.id, captainProfiles.userId))
      .leftJoin(crewProfiles, eq(users.id, crewProfiles.userId));

    const countBase = db
      .select({ count: count() })
      .from(users)
      .leftJoin(captainProfiles, eq(users.id, captainProfiles.userId))
      .leftJoin(crewProfiles, eq(users.id, crewProfiles.userId));

    const dataQuery = whereClause ? dataBase.where(whereClause) : dataBase;
    const countQuery = whereClause ? countBase.where(whereClause) : countBase;

    const [usersData, totalCountResult] = await Promise.all([
      dataQuery.orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      countQuery,
    ]);

    const totalCount = totalCountResult[0]?.count || 0;

    return {
      users: usersData satisfies UserListItem[],
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };
  }

  /**
   * Get single user by ID with optional relations
   * 
   * @param id - User ID
   * @param options - Relations to include (if omitted, returns basic user only)
   * @returns User with requested relations, or null if not found
   * 
   * @example
   * // Basic user (no relations)
   * const user = await userService.getUserById(id);
   * 
   * @example
   * // User with relations for admin detail page
   * const user = await userService.getUserById(id, {
   *   ownedBoats: { limit: 10 },
   *   captainProfile: true,
   *   bookings: { limit: 5 }
   * });
   */
  async getUserById(
    id: string,
    options?: {
      ownedBoats?: { limit: number };
      captainProfile?: true;
      crewProfile?: true;
      bookings?: { limit: number };
      notifications?: { limit: number; unreadOnly?: boolean };
    }
  ): Promise<UserWithRelations | null> {
    // If no options provided, use simple query
    if (!options || Object.keys(options).length === 0) {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user || null;
    }

    // Only the relations asked for are loaded.
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        ...(options.ownedBoats && {
          ownedBoats: {
            columns: {
              id: true,
              name: true,
              category: true,
              active: true,
              featured: true,
              mainImage: true,
              createdAt: true,
            },
            limit: options.ownedBoats.limit,
          },
        }),
        ...(options.captainProfile && {
          captainProfile: { columns: { userId: true, status: true, uscgLicensed: true } },
        }),
        ...(options.crewProfile && {
          crewProfile: { columns: { userId: true, status: true } },
        }),
        ...(options.notifications && {
          notifications: {
            columns: {
              id: true,
              type: true,
              title: true,
              body: true,
              status: true,
              readAt: true,
              createdAt: true,
            },
            limit: options.notifications.limit,
            orderBy: (n, { desc }) => [desc(n.createdAt)],
            ...(options.notifications.unreadOnly && {
              where: (n, { isNull }) => isNull(n.readAt),
            }),
          },
        }),
      },
    });

    if (!user) {
      return null;
    }

    // Handle bookings separately to join with booking_pricing for totalAmountCents
    if (options.bookings) {
      const bookingsData = await db
        .select({
          id: bookings.id,
          bookingStatus: bookings.bookingStatus,
          bookingType: bookings.bookingType,
          startDateTime: bookings.startDateTime,
          createdAt: bookings.createdAt,
          totalAmountCents: bookingPricing.totalAmountCents,
        })
        .from(bookings)
        .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
        .where(eq(bookings.userId, id))
        .orderBy(desc(bookings.createdAt))
        .limit(options.bookings.limit);

      // Transform to match BookingListItemShared type
      const transformedBookings = bookingsData.map((b) => ({
        id: b.id,
        bookingStatus: b.bookingStatus,
        bookingType: b.bookingType,
        startDateTime: b.startDateTime,
        totalAmountCents: b.totalAmountCents ? Number(b.totalAmountCents) : null,
        createdAt: b.createdAt,
      }));

      // Properly type the user with bookings
      (user as UserWithRelations).bookings = transformedBookings;
    }

    return user as UserWithRelations;
  }

  /**
   * Create new user (with password hashing)
   */
  async createUser(userData: CreateUserInput): Promise<User> {
    const { password, roles, email, firstName, lastName, phoneNumber, ...profile } = userData;

    // Better Auth creates the account and its email + password sign-in, and
    // checks the caller may assign these roles.
    const { user: created } = await auth.api.createUser({
      body: {
        email,
        password,
        name: displayName(firstName, lastName, email),
        role: parseRoles(formatRoles(roles)),
        data: { firstName, lastName, phoneNumber },
      },
      headers: await headers(),
    });

    // The rest of the profile (username, address, verification flags…).
    const [newUser] = await db
      .update(users)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(users.id, created.id))
      .returning();

    // Admin vouches for the identity — adopt matching guest bookings even
    // though nothing is verified yet.
    claimGuestBookingsForUser(newUser.id, { adminAsserted: true }).catch((err) =>
      console.error("Guest-booking claim failed:", err)
    );

    return newUser;
  }

  /**
   * Update user (partial updates allowed)
   */
  async updateUser(id: string, data: Partial<UpdateUserInput>): Promise<User> {
    const { password, roles, ...fields } = data;
    const [current] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!current) throw new Error(`User not found: ${id}`);

    const updateData: Partial<User> = { ...fields, updatedAt: new Date() };
    if (fields.email) updateData.email = fields.email.trim().toLowerCase();
    if ("firstName" in fields || "lastName" in fields) {
      updateData.name = displayName(
        "firstName" in fields ? fields.firstName : current.firstName,
        "lastName" in fields ? fields.lastName : current.lastName,
        updateData.email ?? current.email
      );
    }
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error(`User not found: ${id}`);
    }
    if (roles) await setUserRoles(id, mergeAssignableRoles(current.role, roles));
    if (password) await setUserPassword(id, password);

    return updatedUser;
  }


  /**
   * Delete user (hard delete)
   */
  async deleteUser(id: string): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      if (pgErrorCode(error) === '23503') {
        throw new UserFacingError("This person still owns boats, so they can't be deleted. Reassign the boats first.", 409);
      }
      throw error;
    }
  }


  /**
   * Staff a deal can be assigned to: active admins and brokers.
   */
  async getAdmins() {
    const admins = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(and(
        or(hasRoleSql("admin"), hasRoleSql("broker")),
        eq(users.status, 'ACTIVE')
      ))
      .orderBy(desc(users.createdAt))
      .limit(50);
    
    return admins;
  }

  /** People for the account pickers (booking composer, boat owner), newest first. */
  async searchUserOptions(search?: string, limit = 20): Promise<UserOption[]> {
    const term = search?.trim();
    return db
      .select(userOptionColumns)
      .from(users)
      .where(
        term
          ? or(
              ilike(users.firstName, `%${term}%`),
              ilike(users.lastName, `%${term}%`),
              ilike(users.email, `%${term}%`),
              ilike(users.username, `%${term}%`)
            )
          : undefined
      )
      .orderBy(desc(users.createdAt))
      .limit(limit);
  }

  /** One person in the picker shape (shows the current selection). */
  async getUserOption(id: string): Promise<UserOption | null> {
    const [row] = await db.select(userOptionColumns).from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  /** Accounts that have verified this (E.164) number — at most two, enough to spot a shared number. */
  async findVerifiedPhoneAccounts(phone: string): Promise<{ id: string }[]> {
    return db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phoneNumber, phone), eq(users.phoneVerified, true)))
      .limit(2);
  }

  /** May a deal be assigned to this person? (an active admin or broker, as in getAdmins) */
  async isAssignableStaff(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, userId),
        or(hasRoleSql("admin"), hasRoleSql("broker")),
        eq(users.status, 'ACTIVE')
      ))
      .limit(1);
    return row != null;
  }
}

// Export singleton instance
export const userService = new UserService();
