//drizzle
import { db } from '@/database/db';
import { claimGuestBookingsForUser } from '@/features/users/claim-guest-bookings';
import {
  users,
  captainProfiles,
  crewProfiles,
  bookings,
  bookingPricing,
} from '@/database/schema';
import { and, count, eq, desc, or, ilike, getTableColumns } from 'drizzle-orm';
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
  type UserWithRelations,
} from '@/features/users/user.types';

//bcrypt
import { hash } from 'bcryptjs';

/**
 * User Service Layer
 * Single source of truth for all user database operations
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

    if (filters?.status) {
      conditions.push(eq(users.status, filters.status));
    }

    if (filters?.isAdmin !== undefined) {
      conditions.push(eq(users.isAdmin, filters.isAdmin));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dataBase = db
      .select({
        ...getTableColumns(users),
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
      users: usersData as UserListItem[],
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
      reviewsAsReviewer?: { limit: number };
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
        ...(options.reviewsAsReviewer && {
          reviewsAsReviewer: {
            columns: { id: true, rating: true, createdAt: true },
            limit: options.reviewsAsReviewer.limit,
          },
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
    // Hash password before storage (CRITICAL!)
    const hashedPassword = await hash(userData.password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
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
    // Prepare update data
    const updateData: Partial<User> = {
      ...data,
      updatedAt: new Date(),
    };
    
    // Hash password if being updated
    if (data.password) {
      updateData.password = await hash(data.password, 10);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error(`User not found: ${id}`);
    }

    return updatedUser;
  }


  /**
   * Delete user (hard delete)
   */
  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }


  /**
   * Get list of admin users
   * Returns active admin users for assignment dropdowns
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
        eq(users.isAdmin, true),
        eq(users.status, 'ACTIVE')
      ))
      .orderBy(desc(users.createdAt))
      .limit(50);
    
    return admins;
  }
}

// Export singleton instance
export const userService = new UserService();
