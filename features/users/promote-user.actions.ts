"use server";

import { revalidatePath } from "next/cache";

import * as crew from "@/features/profiles/profiles.data";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/** Make someone a captain or crew member (admins). Thin wrappers over profiles.data.ts. */

function revalidatePerson(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/crew");
}

export async function promoteUserToCaptainAction(userId: string, raw: unknown): Promise<ActionResponse<null>> {
  try {
    await crew.promoteToCaptain(userId, raw);
    revalidatePerson(userId);
    return { success: true, data: null, message: "Captain profile saved." };
  } catch (error) {
    return actionError(error, "Failed to save the captain profile");
  }
}

export async function promoteUserToCrewAction(userId: string, raw: unknown): Promise<ActionResponse<null>> {
  try {
    await crew.promoteToCrew(userId, raw);
    revalidatePerson(userId);
    return { success: true, data: null, message: "Crew profile saved." };
  } catch (error) {
    return actionError(error, "Failed to save the crew profile");
  }
}
