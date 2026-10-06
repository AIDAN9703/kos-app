import "server-only";

import { getSignInMethods } from "@/features/users/user-access.service";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/features/users/user-roles.constants";
import { ownerProfileService } from "@/features/profiles/owner-profile.service";
import { userService } from "@/features/users/user.service";
import type { PaginatedUsersResponse, UserOption, UserWithRelations } from "@/features/users/user.types";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilterInput,
} from "@/features/users/user.validation";
import { parseRoles } from "@/shared/lib/auth/permissions";
import { UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Users data layer (admins): the people list, a person's record, and creating,
 * editing or deleting accounts. Each function checks Better Auth's user
 * permissions (create, list, get, update, set-role, set-password, delete).
 * People manage their own accounts through profile.data.ts instead.
 */

// ============================================================================
// READS
// ============================================================================

export async function listUsers(filters?: UserFilterInput): Promise<PaginatedUsersResponse> {
  await assertCan({ user: ["list"] });
  return userService.getAllUsers(filters);
}

/** A person's record for the admin detail page: bookings, crew profiles, sign-in methods. */
export async function getUserDetail(
  id: string
): Promise<{ user: UserWithRelations; signInMethods: string[] } | null> {
  await assertCan({ user: ["get"] });
  if (!isUuid(id)) return null;
  const user = await userService.getUserById(id, { bookings: { limit: 10 }, captainProfile: true, crewProfile: true });
  return user ? { user, signInMethods: await getSignInMethods(id) } : null;
}

/** The edit form's starting values (only fields the form can change). */
export async function getUserForEdit(id: string): Promise<Partial<UpdateUserInput> | null> {
  await assertCan({ user: ["update"] });
  const user = isUuid(id) ? await userService.getUserById(id) : null;
  if (!user) return null;
  return {
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    bio: user.bio || null,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber || null,
    roles: parseRoles(user.role).filter((role): role is AssignableRole =>
      (ASSIGNABLE_ROLES as readonly string[]).includes(role)
    ),
    address: user.address || null,
    city: user.city || null,
    state: user.state || null,
    postalCode: user.postalCode || null,
    country: user.country || null,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    identityVerified: user.identityVerified || false,
    identityVerificationType: user.identityVerificationType || null,
  };
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

/** Create an account with an email + password sign-in. Returns its id. */
export async function createUser(input: CreateUserInput): Promise<{ id: string }> {
  await assertCan({ user: ["create"] });
  const data = createUserSchema.parse(input);
  if (data.roles.length > 0) await assertCan({ user: ["set-role"] });
  const { id } = await userService.createUser(data);
  return { id };
}

/** Update an account; changing roles or the password needs those permissions too. */
export async function updateUser(id: string, input: Partial<UpdateUserInput>): Promise<void> {
  await assertCan({ user: ["update"] });
  if (!isUuid(id)) throw new UserFacingError("User not found", 404);
  const data = updateUserSchema.parse(input);
  if (data.roles) await assertCan({ user: ["set-role"] });
  if (data.password) await assertCan({ user: ["set-password"] });
  await userService.updateUser(id, data);
}

export async function deleteUser(id: string): Promise<void> {
  const admin = await assertCan({ user: ["delete"] });
  if (!isUuid(id)) throw new UserFacingError("User not found", 404);
  if (id === admin.id) throw new UserFacingError("You can't delete your own account here.");
  await userService.deleteUser(id);
}
