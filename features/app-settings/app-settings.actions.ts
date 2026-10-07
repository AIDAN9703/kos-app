"use server";

import { revalidatePath } from "next/cache";

import * as settings from "@/features/app-settings/app-settings.data";
import type { AppSettings } from "@/features/app-settings/app-settings.types";
import { type ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/** Save the settings page (admins). A thin wrapper over app-settings.data.ts. */
export async function updateAppSettings(raw: unknown): Promise<ActionResponse<AppSettings>> {
  try {
    const saved = await settings.updateSettings(raw);
    revalidatePath("/admin/settings");
    return { success: true, data: saved };
  } catch (error) {
    return actionError(error, "Failed to update settings");
  }
}
