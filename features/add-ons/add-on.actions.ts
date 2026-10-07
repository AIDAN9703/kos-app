"use server";

import { revalidatePath } from "next/cache";

import * as addOns from "@/features/add-ons/add-on.data";
import type { AddOn } from "@/features/add-ons/add-on.types";
import { type ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/** Add-on catalog actions (admins). Thin wrappers over add-on.data.ts. */

export async function createAddOn(raw: unknown): Promise<ActionResponse<AddOn>> {
  try {
    const addOn = await addOns.createAddOn(raw);
    revalidatePath("/admin/add-ons");
    return { success: true, data: addOn };
  } catch (error) {
    return actionError(error, "Failed to create add-on");
  }
}

export async function updateAddOn(id: string, raw: unknown): Promise<ActionResponse<AddOn>> {
  try {
    const addOn = await addOns.updateAddOn(id, raw);
    revalidatePath("/admin/add-ons");
    return { success: true, data: addOn };
  } catch (error) {
    return actionError(error, "Failed to update add-on");
  }
}

export async function deleteAddOn(id: string): Promise<ActionResponse<null>> {
  try {
    await addOns.deleteAddOn(id);
    revalidatePath("/admin/add-ons");
    return { success: true, data: null, message: "Add-on deleted" };
  } catch (error) {
    return actionError(error, "Failed to delete add-on");
  }
}
