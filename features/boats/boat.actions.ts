"use server";

import { revalidatePath, updateTag } from "next/cache";

import * as boatData from "@/features/boats/boat.data";
import { type CreateBoatInput, type UpdateBoatInput } from "@/features/boats/boat.validation";
import { type ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * Boat server actions: thin wrappers over boat.data.ts, which checks access
 * and validates the input. Each one refreshes the pages that show boats.
 */

function revalidateBoat(id?: string) {
  updateTag(boatData.PUBLIC_BOATS_TAG);
  revalidatePath("/admin/boats");
  if (id) {
    revalidatePath(`/admin/boats/${id}`);
    revalidatePath(`/boats/${id}`);
  }
}

export async function createBoat(input: CreateBoatInput): Promise<ActionResponse<{ id: string }>> {
  try {
    const boat = await boatData.createBoat(input);
    revalidateBoat(boat.id);
    return { success: true, data: boat };
  } catch (error) {
    return actionError(error, "Failed to create boat");
  }
}

export async function updateBoat(id: string, input: UpdateBoatInput): Promise<ActionResponse<null>> {
  try {
    await boatData.updateBoat(id, input);
    revalidateBoat(id);
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Failed to update boat");
  }
}

export async function deleteBoat(id: string): Promise<ActionResponse<null>> {
  try {
    await boatData.deleteBoat(id);
    revalidateBoat(id);
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Failed to delete boat");
  }
}
