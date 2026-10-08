import "server-only";

/**
 * Crew profile: assignment lists, admin entity table, and promote-from-admin.
 */

import { db } from "@/database/db";
import { crewProfiles, users } from "@/database/schema";
import { and, asc, eq } from "drizzle-orm";
import type { CrewStatus } from "@/database/types";
import type { PromoteCrewFormInput } from "@/features/profiles/promote-crew.validation";
import { addUserRole, notDeactivatedSql } from "@/features/users/user-access.service";

/** Profiles in these states cannot be overwritten by admin promote (already crew or restricted). */
const NON_PROMOTABLE_CREW_STATUSES = new Set<CrewStatus>(["ACTIVE", "ON_LEAVE", "SUSPENDED"]);

class CrewProfileService {
  /** Crew available for booking assignment (active profile + active user). */
  async getCrewForAssignment() {
    return db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(crewProfiles)
      .innerJoin(users, eq(crewProfiles.userId, users.id))
      .where(and(eq(crewProfiles.status, "ACTIVE"), eq(users.status, "ACTIVE"), notDeactivatedSql()))
      .orderBy(asc(users.lastName), asc(users.firstName))
      .limit(200);
  }

  /** May this person be put on a trip as crew? (an active crew profile) */
  async isAssignable(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: users.id })
      .from(crewProfiles)
      .innerJoin(users, eq(crewProfiles.userId, users.id))
      .where(
        and(eq(users.id, userId), eq(crewProfiles.status, "ACTIVE"), eq(users.status, "ACTIVE"), notDeactivatedSql())
      )
      .limit(1);
    return row != null;
  }

  /**
   * Create or (re)activate a crew profile from admin promotion.
   * Sets status ACTIVE so the user appears in booking crew assignment.
   * Fails if profile is already ACTIVE, ON_LEAVE, or SUSPENDED.
   */
  async promoteFromAdmin(userId: string, data: PromoteCrewFormInput): Promise<void> {
    const existing = await db.query.crewProfiles.findFirst({
      where: eq(crewProfiles.userId, userId),
    });
    if (existing && NON_PROMOTABLE_CREW_STATUSES.has(existing.status)) {
      throw new Error("This user already has a crew profile.");
    }

    const notes = data.adminNotes?.trim() || null;

    // The role is what opens the crew pages; the profile holds the details.
    await addUserRole(userId, "crew");

    if (!existing) {
      await db.insert(crewProfiles).values({
        userId,
        status: "ACTIVE",
        adminNotes: notes,
      });
    } else {
      await db
        .update(crewProfiles)
        .set({
          status: "ACTIVE",
          adminNotes: notes,
          updatedAt: new Date(),
        })
        .where(eq(crewProfiles.userId, userId));
    }
  }
}

export const crewProfileService = new CrewProfileService();
