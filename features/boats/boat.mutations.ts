/**
 * Boats Mutations (Server Actions) - CUD Operations Only
 */

"use server";

import { revalidatePath } from "next/cache";
import { type ActionResponse } from "@/shared/lib/types/types";
import { type CreateBoatInput, type UpdateBoatInput } from "@/features/boats/boat.validation";
import { boatService } from "@/features/boats/boat.service";
import { BoatWithTiers } from "./boat.types";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";

// ========================================
// CORE CUD OPERATIONS
// ========================================

/**
 * Create new boat
 */
export async function createBoat(boatData: CreateBoatInput): Promise<ActionResponse<BoatWithTiers>> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  try {
    const newBoat = await boatService.createBoat(boatData);

    revalidatePath('/admin/boats');
    return { success: true, data: newBoat };
  } catch (error) {
    console.error("Error creating boat:", error);
    return { success: false, error: "Failed to create boat" };
  }
}

/**
 * Update boat (partial updates allowed)
 */
export async function updateBoat(
  id: string, 
  updates: Partial<UpdateBoatInput>
): Promise<ActionResponse<BoatWithTiers>> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  try {
    const updatedBoat = await boatService.updateBoat(id, updates);

    revalidatePath('/admin/boats');
    revalidatePath(`/admin/boats/${id}`);
    return { success: true, data: updatedBoat };
  } catch (error) {
    console.error("Error updating boat:", error);
    const message = error instanceof Error ? error.message : "Failed to update boat";
    return { success: false, error: message };
  }
}

/**
 * Delete boat
 */
export async function deleteBoat(id: string): Promise<ActionResponse<{ message: string }>> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  try {
    await boatService.deleteBoat(id);
    revalidatePath('/admin/boats');
    return { success: true, data: { message: "Boat deleted successfully" } };
  } catch (error) {
    console.error("Error deleting boat:", error);
    return { success: false, error: "Failed to delete boat" };
  }
}
