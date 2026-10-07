import "server-only";

import { eq, sql, type SQL } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/database/db";
import { accounts, users } from "@/database/schema";
import { auth } from "@/shared/lib/auth/auth";
import { formatRoles, parseRoles, type Role } from "@/shared/lib/auth/permissions";
import type { AssignableRole } from "./user-roles.constants";

/**
 * Admin changes to someone's roles, through Better Auth's admin API, which
 * checks the caller may do it (user:set-role); and how a person can sign in.
 */

export { ASSIGNABLE_ROLES, type AssignableRole } from "./user-roles.constants";

/** WHERE clause: the user holds `role`. */
export function hasRoleSql(role: Role): SQL {
  return sql`${role} = ANY(string_to_array(${users.role}, ','))`;
}

/** WHERE clause: the account isn't deactivated (a Better Auth ban). */
export function notDeactivatedSql(): SQL {
  return sql`${users.banned} IS NOT TRUE`;
}

export async function setUserRoles(userId: string, list: Role[]): Promise<void> {
  await auth.api.setRole({
    body: { userId, role: parseRoles(formatRoles(list)) },
    headers: await headers(),
  });
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
