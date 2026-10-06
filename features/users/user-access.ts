import "server-only";

import { hash } from "bcryptjs";
import { and, eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/database/db";
import { accounts, users } from "@/database/schema";
import { formatRoles, parseRoles, type Role } from "@/shared/lib/auth/permissions";
import type { AssignableRole } from "./user-roles.constants";

/**
 * Role and password writes made by our own code (admin screens, captain and
 * crew promotion). Better Auth's own flows write through its hooks in
 * shared/lib/auth/auth.ts; both keep the legacy is_admin / password columns in
 * step during the rollout.
 */

export { ASSIGNABLE_ROLES, type AssignableRole } from "./user-roles.constants";

/** WHERE clause: the user holds `role`. */
export function hasRoleSql(role: Role): SQL {
  return sql`${role} = ANY(string_to_array(${users.role}, ','))`;
}

export async function setUserRoles(userId: string, list: Role[]): Promise<void> {
  await db
    .update(users)
    .set({ role: formatRoles(list), isAdmin: list.includes("admin"), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function addUserRole(userId: string, role: Role): Promise<void> {
  const [current] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!current) return;
  const list = parseRoles(current.role);
  if (!list.includes(role)) await setUserRoles(userId, [...list, role]);
}

/**
 * The roles to store after an admin edits the assignable ones: keeps captain
 * and crew (managed elsewhere) and replaces the rest.
 */
export function mergeAssignableRoles(currentRole: string | null, picked: AssignableRole[]): Role[] {
  const kept = parseRoles(currentRole).filter((role) => role === "captain" || role === "crew");
  return [...kept, ...picked];
}

/** How a person can sign in: "credential" (email + password), "google", … */
export async function getSignInMethods(userId: string): Promise<string[]> {
  const rows = await db
    .select({ providerId: accounts.providerId })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  return rows.map((row) => row.providerId);
}

/** Set (or replace) a person's password: the hash lives on their "credential" sign-in method. */
export async function setCredentialPassword(userId: string, password: string): Promise<void> {
  const hashed = await hash(password, 10);
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
    .limit(1);

  if (existing) {
    await db
      .update(accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(accounts.id, existing.id));
  } else {
    await db.insert(accounts).values({ userId, providerId: "credential", accountId: userId, password: hashed });
  }
  await db.update(users).set({ password: hashed }).where(eq(users.id, userId));
}
