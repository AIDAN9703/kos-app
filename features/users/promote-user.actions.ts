"use server";

import { revalidatePath } from "next/cache";
import { captainProfileService } from "@/features/profiles/captain-profile.service";
import { crewProfileService } from "@/features/profiles/crew-profile.service";
import { promoteCaptainFormSchema } from "@/features/profiles/promote-captain.validation";
import { promoteCrewFormSchema } from "@/features/profiles/promote-crew.validation";
import type { ActionResponse } from "@/shared/lib/types/types";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";

function toErrorString(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function promoteUserToCaptainAction(
  userId: string,
  raw: unknown
): Promise<ActionResponse<{ message: string }>> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  const parsed = promoteCaptainFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    await captainProfileService.promoteFromAdmin(userId, parsed.data);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/crew");
    return { success: true, data: { message: "Captain profile saved." } };
  } catch (e) {
    return { success: false, error: toErrorString(e) };
  }
}

export async function promoteUserToCrewAction(
  userId: string,
  raw: unknown
): Promise<ActionResponse<{ message: string }>> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  const parsed = promoteCrewFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    await crewProfileService.promoteFromAdmin(userId, parsed.data);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/crew");
    return { success: true, data: { message: "Crew profile saved." } };
  } catch (e) {
    return { success: false, error: toErrorString(e) };
  }
}
