"use server";

import { revalidatePath } from "next/cache";

import * as users from "@/features/users/user.data";
import { type CreateUserInput, type UpdateUserInput } from "@/features/users/user.validation";
import { type ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * User server actions (admins). Thin wrappers over user.data.ts, which
 * checks the permission and validates the input.
 */

export async function createUser(input: CreateUserInput): Promise<ActionResponse<{ id: string }>> {
  try {
    const created = await users.createUser(input);
    revalidatePath("/admin/users");
    return { success: true, data: created };
  } catch (error) {
    return actionError(error, "Failed to create user");
  }
}

export async function updateUser(id: string, input: Partial<UpdateUserInput>): Promise<ActionResponse<null>> {
  try {
    await users.updateUser(id, input);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Failed to update user");
  }
}

export async function deleteUser(id: string): Promise<ActionResponse<null>> {
  try {
    await users.deleteUser(id);
    revalidatePath("/admin/users");
    return { success: true, data: null, message: "User deleted successfully" };
  } catch (error) {
    return actionError(error, "Failed to delete user");
  }
}
