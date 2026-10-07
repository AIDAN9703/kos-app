import "server-only";

import { APIError } from "better-auth/api";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/database/db";
import {
  boats,
  bookingPricing,
  bookings,
  captainProfiles,
  crewProfiles,
  users,
} from "@/database/schema";
import { claimGuestBookingsForUser } from "@/features/users/claim-guest-bookings.service";
import {
  getSignInMethods,
  hasRoleSql,
  mergeAssignableRoles,
  notDeactivatedSql,
  setUserRoles,
} from "@/features/users/user-access.service";
import type { AssignableRole } from "@/features/users/user-roles.constants";
import type {
  AdminUserProfile,
  PaginatedUsersResponse,
  UserBookingRow,
  UserOption,
} from "@/features/users/user.types";
import type {
  CreateUserData,
  UpdateUserDetailsInput,
  UserFilterInput,
  UserListView,
} from "@/features/users/user.validation";
import { auth } from "@/shared/lib/auth/auth";
import { DEFAULT_ROLE, formatRoles, parseRoles } from "@/shared/lib/auth/permissions";
import { displayName } from "@/shared/lib/auth/session-user";
import { pgErrorCode, UserFacingError } from "@/shared/lib/errors";
import { resolveAdminListPagination } from "@/shared/admin/list-pagination";
import { formatPhoneNumberE164 } from "@/shared/lib/utils/general-utils";

/**
 * User queries and account changes. Server-only and not access-checked:
 * pages, routes and actions go through user.data.ts, which checks the admin
 * permission first. Account changes run through Better Auth's admin API
 * where it has one (create, roles, deactivate, delete).
 */

const userOptionColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  phoneNumber: users.phoneNumber,
  profileImage: users.profileImage,
  username: users.username,
};

function searchSql(term: string): SQL {
  return or(
    ilike(users.firstName, `%${term}%`),
    ilike(users.lastName, `%${term}%`),
    ilike(users.email, `%${term}%`),
    ilike(users.phoneNumber, `%${term}%`)
  )!;
}

function viewSql(view: UserListView): SQL {
  if (view === "deactivated") return sql`${users.banned} IS TRUE`;
  if (view === "customer") return sql`(${users.role} IS NULL OR ${users.role} = ${DEFAULT_ROLE})`;
  return hasRoleSql(view);
}

/** Bookings for a person's page: as their customer, or assigned to them. */
async function bookingRows(where: SQL, limit = 8): Promise<UserBookingRow[]> {
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.bookingStatus,
      customerName: bookings.customerName,
      boatName: boats.name,
      startDateTime: bookings.startDateTime,
      totalAmountCents: bookingPricing.totalAmountCents,
      currency: bookingPricing.currency,
    })
    .from(bookings)
    .leftJoin(boats, eq(bookings.boatId, boats.id))
    .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, totalAmountCents: r.totalAmountCents != null ? Number(r.totalAmountCents) : null }));
}

class UserService {
  /** The people list: search, one view (a role, customers, or deactivated), newest first. */
  async getAllUsers(filters?: UserFilterInput): Promise<PaginatedUsersResponse> {
    const { page, limit, offset } = resolveAdminListPagination(filters);
    const term = filters?.search?.trim();
    const conditions = [term ? searchSql(term) : undefined, filters?.view ? viewSql(filters.view) : undefined].filter(
      (c): c is SQL => c != null
    );
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
          role: users.role,
          phoneNumber: users.phoneNumber,
          emailVerified: users.emailVerified,
          banned: users.banned,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ]);

    return { users: rows, totalCount: total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Everything the admin person page shows, or null. */
  async getAdminProfile(id: string): Promise<AdminUserProfile | null> {
    const [row] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        phoneNumber: users.phoneNumber,
        phoneVerified: users.phoneVerified,
        profileImage: users.profileImage,
        role: users.role,
        banned: users.banned,
        createdAt: users.createdAt,
        stripeCustomerId: users.stripeCustomerId,
        captainStatus: captainProfiles.status,
        crewStatus: crewProfiles.status,
      })
      .from(users)
      .leftJoin(captainProfiles, eq(captainProfiles.userId, users.id))
      .leftJoin(crewProfiles, eq(crewProfiles.userId, users.id))
      .where(eq(users.id, id))
      .limit(1);
    if (!row) return null;

    const roles = parseRoles(row.role);
    const isStaff = roles.includes("admin") || roles.includes("broker");
    const [signInMethods, trips, assignedDeals, ownedBoats, canDelete] = await Promise.all([
      getSignInMethods(id),
      bookingRows(eq(bookings.userId, id)),
      isStaff ? bookingRows(eq(bookings.assignedAdminId, id)) : Promise.resolve([]),
      db
        .select({ id: boats.id, name: boats.name, active: boats.active })
        .from(boats)
        .where(eq(boats.ownerId, id))
        .orderBy(boats.name)
        .limit(20),
      this.hasNoRecords(id),
    ]);

    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      phoneNumber: row.phoneNumber,
      phoneVerified: Boolean(row.phoneVerified),
      profileImage: row.profileImage,
      roles,
      deactivated: Boolean(row.banned),
      createdAt: row.createdAt,
      stripeCustomerId: row.stripeCustomerId,
      signInMethods,
      captainStatus: row.captainStatus,
      crewStatus: row.crewStatus,
      trips,
      assignedDeals,
      boats: ownedBoats,
      canDelete,
    };
  }

  /**
   * True when nothing points at this person — no bookings (as customer,
   * assignee, captain or owner), crew history, deal notes, boats or reviews —
   * so deleting them loses no history.
   */
  async hasNoRecords(id: string): Promise<boolean> {
    const [row] = await db
      .select({
        used: sql<boolean>`(
          EXISTS (SELECT 1 FROM booking WHERE user_id = ${id} OR assigned_admin_id = ${id} OR captain_user_id = ${id} OR boat_owner_id = ${id})
          OR EXISTS (SELECT 1 FROM booking_crew WHERE user_id = ${id})
          OR EXISTS (SELECT 1 FROM booking_admin_note WHERE admin_user_id = ${id})
          OR EXISTS (SELECT 1 FROM boat WHERE owner_id = ${id} OR primary_captain_user_id = ${id})
          OR EXISTS (SELECT 1 FROM review WHERE reviewer_id = ${id})
        )`,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ? !row.used : false;
  }

  /**
   * Create an account with no password and email them a link to choose one
   * (finishing it also verifies their email). Returns its id.
   */
  async createUser(input: CreateUserData): Promise<{ id: string }> {
    const email = input.email.trim().toLowerCase();
    let createdId: string;
    try {
      const { user } = await auth.api.createUser({
        body: {
          email,
          name: displayName(input.firstName, input.lastName, email),
          role: parseRoles(formatRoles(input.roles)),
          data: { firstName: input.firstName, lastName: input.lastName, phoneNumber: input.phoneNumber || null },
        },
        headers: await headers(),
      });
      createdId = user.id;
    } catch (error) {
      if (error instanceof APIError && String(error.body?.code ?? "").startsWith("USER_ALREADY_EXISTS")) {
        throw new UserFacingError("Someone already has an account with this email.", 409);
      }
      throw error;
    }

    // The admin vouches for who this is: adopt guest bookings made with this email.
    claimGuestBookingsForUser(createdId, { adminAsserted: true }).catch((err) =>
      console.error("Guest-booking claim failed:", err)
    );
    await this.sendPasswordEmail(email);
    return { id: createdId };
  }

  /**
   * Change a person's name, email or phone. A new email or phone isn't
   * verified until they prove it (a new email gets a confirmation link).
   */
  async updateDetails(id: string, input: UpdateUserDetailsInput): Promise<void> {
    const [current] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email, phoneNumber: users.phoneNumber })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!current) throw new UserFacingError("User not found", 404);

    const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    let newEmail: string | null = null;
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      if (email !== current.email) {
        set.email = newEmail = email;
        set.emailVerified = false;
      }
    }
    if (input.phoneNumber !== undefined) {
      const phone = input.phoneNumber ? formatPhoneNumberE164(input.phoneNumber) : null;
      if (phone !== current.phoneNumber) {
        set.phoneNumber = phone;
        set.phoneVerified = false;
      }
    }
    if (input.firstName !== undefined || input.lastName !== undefined) {
      set.firstName = input.firstName ?? current.firstName;
      set.lastName = input.lastName ?? current.lastName;
      set.name = displayName(set.firstName, set.lastName, set.email ?? current.email);
    }

    try {
      await db.update(users).set(set).where(eq(users.id, id));
    } catch (error) {
      if (pgErrorCode(error) === "23505") throw new UserFacingError("Someone else already uses that email.", 409);
      throw error;
    }
    if (newEmail) {
      await auth.api.sendVerificationEmail({ body: { email: newEmail, callbackURL: "/profile" } }).catch((err) =>
        console.error("Verification email failed:", err)
      );
    }
  }

  /** Replace the admin / broker / owner roles (captain and crew are kept). */
  async setAssignableRoles(id: string, picked: AssignableRole[]): Promise<void> {
    const [current] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
    if (!current) throw new UserFacingError("User not found", 404);
    await setUserRoles(id, mergeAssignableRoles(current.role, picked));
  }

  /** Deactivate (signs them out everywhere and blocks sign-in) or reactivate. */
  async setDeactivated(id: string, deactivated: boolean): Promise<void> {
    const requestHeaders = await headers();
    if (deactivated) {
      await auth.api.banUser({ body: { userId: id, banReason: "Deactivated by an admin" }, headers: requestHeaders });
    } else {
      await auth.api.unbanUser({ body: { userId: id }, headers: requestHeaders });
    }
  }

  /** Email the set-password (or reset-password) link. */
  async sendPasswordEmail(email: string): Promise<void> {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
  }

  /** Delete an account outright — only when nothing points at it (see hasNoRecords). */
  async deleteUser(id: string): Promise<void> {
    if (!(await this.hasNoRecords(id))) {
      throw new UserFacingError("This person has bookings or history, so they can't be deleted. Deactivate them instead.", 409);
    }
    await auth.api.removeUser({ body: { userId: id }, headers: await headers() });
  }

  /** Staff a deal can be assigned to: active admins and brokers. */
  async getAdmins() {
    return db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(and(or(hasRoleSql("admin"), hasRoleSql("broker")), eq(users.status, "ACTIVE"), notDeactivatedSql()))
      .orderBy(desc(users.createdAt))
      .limit(50);
  }

  /** People for the account pickers (booking composer, boat owner), newest first. */
  async searchUserOptions(search?: string, limit = 20): Promise<UserOption[]> {
    const term = search?.trim();
    return db
      .select(userOptionColumns)
      .from(users)
      .where(and(notDeactivatedSql(), term ? searchSql(term) : undefined))
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
      .where(
        and(eq(users.id, userId), or(hasRoleSql("admin"), hasRoleSql("broker")), eq(users.status, "ACTIVE"), notDeactivatedSql())
      )
      .limit(1);
    return row != null;
  }
}

export const userService = new UserService();
