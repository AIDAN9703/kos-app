"use server";

import { revalidatePath } from "next/cache";

import * as users from "@/features/users/user.data";
import type { AssignableRole } from "@/features/users/user-roles.constants";
import type { CreateUserInput, UpdateUserDetailsInput } from "@/features/users/user.validation";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * User server actions (admins). Thin wrappers over user.data.ts, which checks
 * the permission and validates the input; these refresh the pages and report
 * the outcome.
 */

type Done = ActionResponse<null>;

async function run(userId: string, work: () => Promise<void>, message: string, fallback: string): Promise<Done> {
  try {
    await work();
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: null, message };
  } catch (error) {
    return actionError(error, fallback);
  }
}

export async function createUser(input: CreateUserInput): Promise<ActionResponse<{ id: string }>> {
  try {
    const created = await users.createUser(input);
    revalidatePath("/admin/users");
    return {
      success: true,
      data: created,
      message: "User created. We emailed them a link to choose a password.",
    };
  } catch (error) {
    return actionError(error, "Couldn't create the user.");
  }
}

export async function updateUserDetails(userId: string, input: UpdateUserDetailsInput): Promise<Done> {
  return run(
    userId,
    () => users.updateUserDetails(userId, input),
    input.email ? "Saved. We emailed the new address a confirmation link." : "Saved.",
    "Couldn't save that change."
  );
}

export async function setUserAccess(userId: string, roles: AssignableRole[]): Promise<Done> {
  return run(userId, () => users.setUserAccess(userId, roles), "Access updated.", "Couldn't change their access.");
}

export async function sendUserPasswordEmail(userId: string): Promise<Done> {
  return run(userId, () => users.sendUserPasswordEmail(userId), "Password email sent.", "Couldn't send the email.");
}

export async function setUserDeactivated(userId: string, deactivated: boolean): Promise<Done> {
  return run(
    userId,
    () => users.setUserDeactivated(userId, deactivated),
    deactivated ? "Deactivated. They've been signed out." : "Reactivated.",
    deactivated ? "Couldn't deactivate them." : "Couldn't reactivate them."
  );
}

export async function deleteUser(userId: string): Promise<Done> {
  try {
    await users.deleteUser(userId);
    revalidatePath("/admin/users");
    return { success: true, data: null, message: "User deleted." };
  } catch (error) {
    return actionError(error, "Couldn't delete the user.");
  }
}
