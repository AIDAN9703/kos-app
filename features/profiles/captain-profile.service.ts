/**
 * Captain profile: assignment lists, admin entity table, and promote-from-admin.
 */

import { db } from "@/database/db";
import { captainProfiles, users } from "@/database/schema";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { CaptainStatus, UserStatus } from "@/database/types";
import type { PromoteCaptainFormInput } from "@/features/profiles/promote-captain.validation";
import { addUserRole } from "@/features/users/user-access";

const DISABLED_STATUS: CaptainStatus = "INACTIVE";

export type CaptainProfileAdminRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  profileImage: string | null;
  userStatus: UserStatus;
  profileStatus: CaptainStatus;
  uscgLicensed: boolean;
  licenseType: string | null;
  profileUpdatedAt: Date;
};

export class CaptainProfileService {
  /** Captains available for booking assignment (active profile + active user). */
  async getCaptainsForAssignment() {
    return db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(captainProfiles)
      .innerJoin(users, eq(captainProfiles.userId, users.id))
      .where(
        and(eq(captainProfiles.status, "ACTIVE"), eq(users.status, "ACTIVE"))
      )
      .orderBy(asc(users.lastName), asc(users.firstName))
      .limit(200);
  }

  /** May this person be put on a trip as captain? (an active captain profile) */
  async isAssignable(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: users.id })
      .from(captainProfiles)
      .innerJoin(users, eq(captainProfiles.userId, users.id))
      .where(
        and(
          eq(users.id, userId),
          eq(captainProfiles.status, "ACTIVE"),
          eq(users.status, "ACTIVE")
        )
      )
      .limit(1);
    return row != null;
  }

  /** Captain profiles for admin (no pagination — fleet pool is small). */
  async listForAdmin(filters: {
    search?: string | null;
    status?: CaptainStatus | null;
  }): Promise<CaptainProfileAdminRow[]> {
    const conditions = [];
    const q = filters.search?.trim();
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
          ilike(users.email, pattern),
          ilike(users.phoneNumber, pattern)
        )!
      );
    }
    if (filters.status) {
      conditions.push(eq(captainProfiles.status, filters.status));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dataBase = db
      .select({
        userId: captainProfiles.userId,
        profileStatus: captainProfiles.status,
        uscgLicensed: captainProfiles.uscgLicensed,
        licenseType: captainProfiles.licenseType,
        profileUpdatedAt: captainProfiles.updatedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        profileImage: users.profileImage,
        userStatus: users.status,
      })
      .from(captainProfiles)
      .innerJoin(users, eq(captainProfiles.userId, users.id));
    const dataQuery = whereClause ? dataBase.where(whereClause) : dataBase;

    const rows = await dataQuery.orderBy(
      asc(users.firstName),
      asc(users.lastName),
      asc(users.email)
    );

    return rows.map((r) => ({
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phoneNumber: r.phoneNumber,
      profileImage: r.profileImage,
      userStatus: r.userStatus,
      profileStatus: r.profileStatus,
      uscgLicensed: r.uscgLicensed,
      licenseType: r.licenseType,
      profileUpdatedAt: r.profileUpdatedAt,
    }));
  }

  /**
   * Create or reactivate a captain profile from admin promotion (with compliance fields).
   * Fails if a non-INACTIVE profile already exists.
   */
  async promoteFromAdmin(userId: string, data: PromoteCaptainFormInput): Promise<void> {
    const existing = await db.query.captainProfiles.findFirst({
      where: eq(captainProfiles.userId, userId),
    });
    if (existing && existing.status !== DISABLED_STATUS) {
      throw new Error("This user already has a captain profile.");
    }

    const expiryRaw = data.licenseExpiry?.trim();
    let licenseExpiry: Date | null = null;
    if (expiryRaw) {
      const d = new Date(expiryRaw);
      if (!Number.isNaN(d.getTime())) {
        licenseExpiry = d;
      }
    }

    const payload = {
      uscgLicensed: data.uscgLicensed,
      licenseType: data.licenseType?.trim() || null,
      licenseNumber: data.licenseNumber?.trim() || null,
      licenseExpiry,
      emergencyContactName: data.emergencyContactName?.trim() || null,
      emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
      yearsExperience: data.yearsExperience ?? null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zip: data.zip?.trim() || null,
      adminNotes: data.adminNotes?.trim() || null,
      updatedAt: new Date(),
    };

    // The role is what opens the captain pages; the profile holds the details.
    await addUserRole(userId, "captain");

    if (!existing) {
      await db.insert(captainProfiles).values({
        userId,
        status: "PENDING",
        ...payload,
      });
    } else {
      await db
        .update(captainProfiles)
        .set({
          status: "PENDING",
          ...payload,
        })
        .where(eq(captainProfiles.userId, userId));
    }
  }
}

export const captainProfileService = new CaptainProfileService();
