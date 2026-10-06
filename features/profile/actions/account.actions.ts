"use server";

import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/database/db";
import { users } from "@/database/schema";
import { notificationPreferenceEnum } from "@/database/schema/enums";
import { profileUpdateSchema, type ProfileFormValues } from "@/features/_validation/validations";
import { passwordSchema } from "@/shared/lib/validation/common";
import { auth as betterAuth } from "@/shared/lib/auth/auth";
import { displayName } from "@/shared/lib/auth/session-user";
import { getAuthenticatedUserId, getSession } from "@/shared/lib/utils/auth-utils";
import { emailSchema } from "@/shared/lib/validation/common";
import { formatPhoneNumberE164 } from "@/shared/lib/utils/general-utils";
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

/** Same number regardless of formatting ("305-555-0100" vs "+13055550100"). */
function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ? formatPhoneNumberE164(a) : null) === (b ? formatPhoneNumberE164(b) : null);
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
type AccountColumns = Pick<typeof users.$inferInsert, keyof ProfileFormValues | "name">;

export async function updateAccountDetails(
  input: Partial<ProfileFormValues>
): Promise<ActionResult> {
  // Email changes go through requestEmailChange, which confirms the new address first.
  const { email: _ignoredEmail, ...changes } = input;
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
    return {
      success: false,
      error: "Please check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  // Only touch what the caller sent; empty strings clear optional columns.
  // profileUpdateSchema already decides which columns may be null, so the one
  // cast below just bridges zod's wider `string | null | undefined` to the
  // column types.
  const update = Object.fromEntries(
    (Object.keys(changes) as (keyof ProfileFormValues)[]).map((key) => {
      const value = parsed.data[key];
      if (value === "") return [key, null];
      // Store phones as +1XXXXXXXXXX: phone sign-in and booking matching look them up that way.
      if (key === "phoneNumber" && value) return [key, formatPhoneNumberE164(value)];
      return [key, value];
    })
  ) as Partial<AccountColumns>;
  if (Object.keys(update).length === 0) return { success: true };

  // A new phone is unproven until it's verified again. Keeping the old
  // verified flag would let someone switch to another person's number and
  // claim their guest bookings.
  const reverify: { phoneVerified?: boolean } = {};
  if ("phoneNumber" in update && !samePhone(update.phoneNumber, current.phoneNumber)) {
    reverify.phoneVerified = false;
  }

  // The display name follows first + last name.
  if ("firstName" in update || "lastName" in update) {
    update.name = displayName(
      "firstName" in update ? update.firstName : current.firstName,
      "lastName" in update ? update.lastName : current.lastName,
      current.email
    );
  }

  try {
    await db
      .update(users)
      .set({ ...update, ...reverify, updatedAt: new Date() })
      .where(eq(users.id, auth.userId));
  } catch (error) {
    console.error("updateAccountDetails failed:", error);
    return { success: false, error: "We couldn't save that. Please try again." };
  }

  revalidateProfile();
  return { success: true };
}

/**
 * Change the sign-in email the safe way (Better Auth's change-email flow):
 * nothing changes until the person opens a link sent to the NEW address, and
 * a verified account first approves from its CURRENT address. An address
 * that already has an account gets the same answer, so this can't be used to
 * discover who has an account.
 */
export async function requestEmailChange(
  input: Partial<ProfileFormValues>
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const parsed = emailSchema.safeParse(input.email?.trim() ?? "");
  if (!parsed.success) {
    return {
      success: false,
      error: "Please check the highlighted fields.",
      fieldErrors: { email: [parsed.error.issues[0]?.message ?? "Enter a valid email"] },
    };
  }
  const newEmail = parsed.data.toLowerCase();
  if (newEmail === session.user.email) return { success: true, message: "That's already your email." };

  try {
    await betterAuth.api.changeEmail({
      body: { newEmail, callbackURL: "/profile/settings?verified=1" },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.message) {
      return { success: false, error: error.body.message };
    }
    console.error("requestEmailChange failed:", error);
    return { success: false, error: "We couldn't start the change. Please try again." };
  }

  return {
    success: true,
    message: session.user.emailVerified
      ? `To keep your account safe, approve the change from your current email first. Then confirm ${newEmail}.`
      : `We sent a link to ${newEmail}. Your email changes once you open it.`,
  };
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
  // Empty when the account has no password yet (Google or phone sign-up).
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Change the password, or set a first one for accounts that sign in with
 * Google or a texted code. Changing it signs out every other device.
 */
export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const auth = await getAuthenticatedUserId();
  if (!auth.userId) return { success: false, error: auth.error ?? "Not authenticated" };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const requestHeaders = await headers();
  const methods = await betterAuth.api.listUserAccounts({ headers: requestHeaders });
  const hasPassword = methods.some((method) => method.providerId === "credential");
  const { currentPassword, newPassword } = parsed.data;

  if (hasPassword && !currentPassword) {
    return {
      success: false,
      error: "Please check the highlighted fields.",
      fieldErrors: { currentPassword: ["Enter your current password"] },
    };
  }

  try {
    if (hasPassword) {
      await betterAuth.api.changePassword({
        body: { currentPassword: currentPassword!, newPassword, revokeOtherSessions: true },
        headers: requestHeaders,
      });
    } else {
      await betterAuth.api.setPassword({ body: { newPassword }, headers: requestHeaders });
    }
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      return {
        success: false,
        error: "That current password isn't right.",
        fieldErrors: { currentPassword: ["That current password isn't right."] },
      };
    }
    if (error instanceof APIError && error.body?.message) {
      return { success: false, error: error.body.message };
    }
    console.error("changePassword failed:", error);
    return { success: false, error: "We couldn't update your password. Please try again." };
  }

  return { success: true };
}
