import "server-only";

/**
 * Owner profile reads (users who can own / list boats).
 */

import { db } from "@/database/db";
import { users } from "@/database/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { hasRoleSql } from "@/features/users/user-access.service";

class OwnerProfileService {
  /**
   * People an admin can set as a boat's owner: anyone with the Owner role.
   * (The owner_profile row only holds business details, and may not exist yet.)
   */
  async getOwnersForAssignment(search?: string) {
    const conditions = [eq(users.status, "ACTIVE"), hasRoleSql("owner")];

    if (search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.username, `%${search}%`)
        )!
      );
    }

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
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(50);
  }
}

export const ownerProfileService = new OwnerProfileService();
