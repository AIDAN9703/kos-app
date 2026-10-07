import "server-only";

import { ownerProfileService } from "@/features/profiles/owner-profile.service";
import type { AssignableRole } from "@/features/users/user-roles.constants";
import { userService } from "@/features/users/user.service";
import type { AdminUserProfile, PaginatedUsersResponse, UserOption } from "@/features/users/user.types";
import {
  assignableRolesSchema,
  createUserSchema,
  updateUserDetailsSchema,
  type CreateUserInput,
  type UpdateUserDetailsInput,
  type UserFilterInput,
} from "@/features/users/user.validation";
import { invalidFieldsFrom, UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Users data layer (admins): the people list, a person's page, and changes to
 * their account. Each function checks Better Auth's user permissions (list,
 * get, create, update, set-role, ban, delete). People manage their own
 * accounts through profile.data.ts instead.
 */

function requireUserId(id: string): void {
  if (!isUuid(id)) throw new UserFacingError("User not found", 404);
}

// ============================================================================
// READS
// ============================================================================

export async function listUsers(filters?: UserFilterInput): Promise<PaginatedUsersResponse> {
  await assertCan({ user: ["list"] });
  return userService.getAllUsers(filters);
}

/** Everything the admin person page shows. */
export async function getUserProfile(id: string): Promise<AdminUserProfile | null> {
  await assertCan({ user: ["get"] });
  return isUuid(id) ? userService.getAdminProfile(id) : null;
}

/** People for the account pickers (linking a booking, choosing a boat owner). */
export async function searchUserOptions(search?: string): Promise<UserOption[]> {
  await assertCan({ user: ["list"] });
  return userService.searchUserOptions(search);
}

export async function getUserOption(id: string): Promise<UserOption | null> {
  await assertCan({ user: ["list"] });
  return isUuid(id) ? userService.getUserOption(id) : null;
}

/** People who can own a boat (the Owner role), for the boat form. */
export async function listBoatOwnerOptions(search?: string) {
  await assertCan({ boat: ["edit"] });
  return ownerProfileService.getOwnersForAssignment(search?.trim() || undefined);
}

// ============================================================================
// WRITES
// ============================================================================

/** Create an account and email them a link to choose a password. Returns its id. */
export async function createUser(input: CreateUserInput): Promise<{ id: string }> {
  await assertCan({ user: ["create"] });
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) throw invalidFieldsFrom(parsed.error);
  if (parsed.data.roles.length > 0) await assertCan({ user: ["set-role"] });
  return userService.createUser(parsed.data);
}

/** Change a person's name, email or phone (one row of their page). */
export async function updateUserDetails(id: string, input: UpdateUserDetailsInput): Promise<void> {
  await assertCan({ user: ["update"] });
  requireUserId(id);
  const parsed = updateUserDetailsSchema.safeParse(input);
  if (!parsed.success) throw invalidFieldsFrom(parsed.error);
  await userService.updateDetails(id, parsed.data);
}

/** Set someone's admin / broker / owner access. You can't take away your own admin. */
export async function setUserAccess(id: string, roles: AssignableRole[]): Promise<void> {
  const me = await assertCan({ user: ["set-role"] });
  requireUserId(id);
  const picked = assignableRolesSchema.parse(roles);
  if (id === me.id && !picked.includes("admin")) {
    throw new UserFacingError("You can't remove your own admin access.");
  }
  await userService.setAssignableRoles(id, picked);
}

/** Email them a link to choose a new password (or their first one). */
export async function sendUserPasswordEmail(id: string): Promise<void> {
  await assertCan({ user: ["update"] });
  requireUserId(id);
  const profile = await userService.getUserOption(id);
  if (!profile) throw new UserFacingError("User not found", 404);
  await userService.sendPasswordEmail(profile.email);
}

/** Deactivate (signed out everywhere, can't sign in; history kept) or reactivate. */
export async function setUserDeactivated(id: string, deactivated: boolean): Promise<void> {
  const me = await assertCan({ user: ["ban"] });
  requireUserId(id);
  if (id === me.id) throw new UserFacingError("You can't deactivate your own account.");
  await userService.setDeactivated(id, deactivated);
}

/** Delete an account outright — only one with no bookings or history. */
export async function deleteUser(id: string): Promise<void> {
  const me = await assertCan({ user: ["delete"] });
  requireUserId(id);
  if (id === me.id) throw new UserFacingError("You can't delete your own account here.");
  await userService.deleteUser(id);
}
