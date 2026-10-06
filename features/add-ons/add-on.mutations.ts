"use server";

import { revalidatePath } from "next/cache";

import { type ActionResponse } from "@/shared/lib/types/types";
import { addOnService } from "@/features/add-ons/add-on.service";
import {
  createAddOnSchema,
  updateAddOnSchema,
} from "@/features/add-ons/add-on.validation";
import type { AddOn } from "@/features/add-ons/add-on.types";
import { getSession } from "@/shared/lib/utils/auth-utils";

function zodMessage(error: { issues: { message: string }[] }): string {
  return error.issues.map((i) => i.message).join(", ");
}

export async function createAddOn(raw: unknown): Promise<ActionResponse<AddOn>> {
  const session = await getSession();
  if (!session?.user?.isAdmin) {
    return { success: false, error: "Admin access required" };
  }

  const parsed = createAddOnSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: zodMessage(parsed.error) };
  }

  try {
    const addOn = await addOnService.createAddOn(parsed.data);
    revalidatePath("/admin/add-ons");
    return { success: true, data: addOn };
  } catch (error) {
    console.error("Error creating add-on:", error);
    return { success: false, error: "Failed to create add-on" };
  }
}

export async function updateAddOn(
  id: string,
  raw: unknown
): Promise<ActionResponse<AddOn>> {
  const session = await getSession();
  if (!session?.user?.isAdmin) {
    return { success: false, error: "Admin access required" };
  }

  const parsed = updateAddOnSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: zodMessage(parsed.error) };
  }

  try {
    const addOn = await addOnService.updateAddOn(id, parsed.data);
    revalidatePath("/admin/add-ons");
    return { success: true, data: addOn };
  } catch (error) {
    console.error("Error updating add-on:", error);
    return { success: false, error: "Failed to update add-on" };
  }
}

export async function deleteAddOn(
  id: string
): Promise<ActionResponse<{ message: string }>> {
  const session = await getSession();
  if (!session?.user?.isAdmin) {
    return { success: false, error: "Admin access required" };
  }

  try {
    await addOnService.deleteAddOn(id);
    revalidatePath("/admin/add-ons");
    return { success: true, data: { message: "Add-on deleted" } };
  } catch (error) {
    console.error("Error deleting add-on:", error);
    return { success: false, error: "Failed to delete add-on" };
  }
}
