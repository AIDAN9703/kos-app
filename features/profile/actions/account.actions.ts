"use server";

import { revalidatePath } from "next/cache";

import type { ProfileFormValues } from "@/features/_validation/validations";
import * as profile from "@/features/profile/profile.data";
import type { ActionResult } from "@/features/profile/profile.types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * Changes a signed-in person makes to their own account. Thin wrappers over
 * profile.data.ts, which takes the person from the session and returns field
 * errors the inline editors show next to each field.
 */

/** Refresh every profile page: the identity card in the layout shows name and photo. */
function revalidateProfile() {
  revalidatePath("/profile", "layout");
}

export async function updateAccountDetails(input: Partial<ProfileFormValues>): Promise<ActionResult> {
  try {
    await profile.updateMyAccount(input);
    revalidateProfile();
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "We couldn't save that. Please try again.");
  }
}

export async function requestEmailChange(input: Partial<ProfileFormValues>): Promise<ActionResult> {
  try {
    return { success: true, data: null, message: await profile.requestMyEmailChange(input) };
  } catch (error) {
    return actionError(error, "We couldn't start the change. Please try again.");
  }
}

export async function updateNotificationPreferences(
  input: profile.NotificationPreferencesInput
): Promise<ActionResult> {
  try {
    await profile.updateMyNotificationPreferences(input);
    revalidatePath("/profile/settings");
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "We couldn't save that. Please try again.");
  }
}

export async function changePassword(input: profile.ChangePasswordInput): Promise<ActionResult> {
  try {
    await profile.changeMyPassword(input);
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "We couldn't update your password. Please try again.");
  }
}
