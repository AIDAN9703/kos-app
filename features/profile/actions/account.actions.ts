"use server";

import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/database/db";
import { users } from "@/database/schema";
import { notificationPreferenceEnum } from "@/database/schema/enums";
import { profileUpdateSchema, type ProfileFormValues } from "@/features/_validation/validations";
import { passwordSchema } from "@/shared/lib/validation/common";
import { getAuthenticatedUserId } from "@/shared/lib/utils/auth-utils";
import type { ActionResult } from "../profile.types";

/**
 * Mutations a signed-in customer can make to their own account. Every action
 * resolves the user from the session — never from an argument — and returns
 * an ActionResult instead of throwing, so the inline editors can show errors
 * next to the field.
 */

/** Refresh every profile page: the identity card in the layout shows name and photo. */
function revalidateProfile() {
  revalidatePath("/profile", "layout");
}

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
    )
  );
}

/**
 * Update any subset of the editable account fields. The merged record is
 * validated as a whole (so a required name can't be blanked), but only the
 * keys that were passed are written.
 */
/** The user columns the settings page can edit — exactly the keys of ProfileFormValues. */
type AccountColumns = Pick<typeof users.$inferInsert, keyof ProfileFormValues>;

export async function updateAccountDetails(
  changes: Partial<ProfileFormValues>
): Promise<ActionResult> {
  const auth = await getAuthenticatedUserId();
  if (!auth.userId) return { success: false, error: auth.error ?? "Not authenticated" };

  const [current] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
  if (!current) return { success: false, error: "Account not found" };

  const parsed = profileUpdateSchema.safeParse({
    firstName: current.firstName,
    lastName: current.lastName,
    email: current.email,
    phoneNumber: current.phoneNumber,
    bio: current.bio,
    address: current.address,
    city: current.city,
    state: current.state,
    country: current.country,
    postalCode: current.postalCode,
    profileImage: current.profileImage,
    ...changes,
  });
  if (!parsed.success) {
    return { success: false, error: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  // Only touch what the caller sent; empty strings clear optional columns.
  // profileUpdateSchema already decides which columns may be null, so the one
  // cast below just bridges zod's wider `string | null | undefined` to the
  // column types.
  const update = Object.fromEntries(
    (Object.keys(changes) as (keyof ProfileFormValues)[]).map((key) => {
      const value = parsed.data[key];
      return [key, value === "" ? null : value];
    })
  ) as Partial<AccountColumns>;
  if (Object.keys(update).length === 0) return { success: true };

  try {
    await db
      .update(users)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(users.id, auth.userId));
  } catch (error) {
    console.error("updateAccountDetails failed:", error);
    return { success: false, error: "We couldn't save that. Please try again." };
  }

  revalidateProfile();
  return { success: true };
}

const notificationPreferencesSchema = z
  .object({
    emailNotifications: z.enum(notificationPreferenceEnum.enumValues),
    smsNotifications: z.enum(notificationPreferenceEnum.enumValues),
    marketingEmailsEnabled: z.boolean(),
  })
  .partial();

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

export async function updateNotificationPreferences(
  input: NotificationPreferencesInput
): Promise<ActionResult> {
  const auth = await getAuthenticatedUserId();
  if (!auth.userId) return { success: false, error: auth.error ?? "Not authenticated" };

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid notification setting." };

  try {
    await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, auth.userId));
  } catch (error) {
    console.error("updateNotificationPreferences failed:", error);
    return { success: false, error: "We couldn't save that. Please try again." };
  }

  revalidatePath("/profile/settings");
  return { success: true };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Email/password accounts only — Google accounts have a placeholder hash and no password to change. */
export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const auth = await getAuthenticatedUserId();
  if (!auth.userId) return { success: false, error: auth.error ?? "Not authenticated" };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const [current] = await db
    .select({ password: users.password, authProvider: users.authProvider })
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);
  if (!current) return { success: false, error: "Account not found" };
  if (current.authProvider === "GOOGLE") {
    return { success: false, error: "This account signs in with Google and has no password." };
  }

  const matches = await compare(parsed.data.currentPassword, current.password);
  if (!matches) {
    return {
      success: false,
      error: "That current password isn't right.",
      fieldErrors: { currentPassword: ["That current password isn't right."] },
    };
  }

  try {
    await db
      .update(users)
      .set({ password: await hash(parsed.data.newPassword, 10), updatedAt: new Date() })
      .where(eq(users.id, auth.userId));
  } catch (error) {
    console.error("changePassword failed:", error);
    return { success: false, error: "We couldn't update your password. Please try again." };
  }

  return { success: true };
}
