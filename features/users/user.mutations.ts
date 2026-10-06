/**
 * Users Mutations (Server Actions) - CUD Operations Only
 */

"use server";

import { revalidatePath } from "next/cache";
import { User } from "@/database/types";
import { ActionResponse } from "@/shared/lib/types/types";
import { CreateUserInput, UpdateUserInput } from "@/features/users/user.validation";
import { userService } from "@/features/users/user.service";
import { getSession } from "@/shared/lib/utils/auth-utils";

function toErrorString(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Create new user
 */
export async function createUser(
  userData: CreateUserInput
): Promise<ActionResponse<{ user: User }>> {
  const session = await getSession();

  if (!session?.user?.isAdmin) {
    return { success: false, error: "You are not authorized to create a user" };
  }

  try {
    const newUser = await userService.createUser(userData);

    revalidatePath("/admin/users");
    return { success: true, data: { user: newUser } };
  } catch (error) {
    return { success: false, error: toErrorString(error) };
  }
}

/**
 * Update user (partial updates allowed)
 * Since all fields in UpdateUserInput are optional, we can pass partial updates
 */
export async function updateUser(
  id: string,
  updates: Partial<UpdateUserInput>
): Promise<ActionResponse<{ user: User }>> {
  const session = await getSession();

  if (!session?.user?.isAdmin) {
    return { success: false, error: "You are not authorized to update this user" };
  }

  try {
    const updatedUser = await userService.updateUser(id, updates);

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return { success: true, data: { user: updatedUser } };
  } catch (error) {
    return { success: false, error: toErrorString(error) };
  }
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<ActionResponse<{ message: string }>> {
  const session = await getSession();

  if (!session?.user?.isAdmin) {
    return { success: false, error: "You are not authorized to delete this user" };
  }

  try {
    await userService.deleteUser(id);
    revalidatePath("/admin/users");
    return { success: true, data: { message: "User deleted successfully" } };
  } catch (error) {
    return { success: false, error: toErrorString(error) };
  }
}
