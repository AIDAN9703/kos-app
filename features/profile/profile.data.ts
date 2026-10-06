import "server-only";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";

import { notificationPreferenceEnum } from "@/database/schema/enums";
import { profileUpdateSchema, type ProfileFormValues } from "@/features/_validation/validations";
import { getOrCreateCheckoutUrl } from "@/features/bookings/services/checkout.service";
import * as profileService from "@/features/profile/profile.service";
import type { AccountUser, CaptainSummary, TripDetail, TripSummary } from "@/features/profile/profile.types";
import { auth } from "@/shared/lib/auth/auth";
import { displayName } from "@/shared/lib/auth/session-user";
import { AccessDenied, InvalidFields, UserFacingError } from "@/shared/lib/errors";
import { assertSignedIn, hasRole } from "@/shared/lib/utils/auth-utils";
import { formatPhoneNumberE164, isUuid } from "@/shared/lib/utils/general-utils";
import { emailSchema, passwordSchema } from "@/shared/lib/validation/common";

/**
 * Profile data layer: the signed-in person's own account, trips and (for
 * captains) assignments. Every function reads the person from the session —
 * never an id from the browser — so nobody can reach another account's rows.
 */

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
    )
  );
}

// ============================================================================
// READS
// ============================================================================

export async function getMyAccount(): Promise<AccountUser | null> {
  const me = await assertSignedIn();
  return profileService.getAccount(me.id);
}

export async function getMyTrips(): Promise<TripSummary[]> {
  const me = await assertSignedIn();
  return profileService.getTrips(me.id);
}

/** One of the person's own trips; someone else's booking id is a miss, not a leak. */
export async function getMyTrip(bookingId: string): Promise<TripDetail | null> {
  const me = await assertSignedIn();
  return isUuid(bookingId) ? profileService.getTrip(me.id, bookingId) : null;
}

/** A captain's upcoming assignments and record. */
export async function getMyCaptainSummary(): Promise<CaptainSummary | null> {
  const me = await assertSignedIn();
  if (!hasRole(me, "captain")) throw new AccessDenied();
  return profileService.getCaptainSummary(me.id);
}

/** How the person can sign in, and on how many devices they're signed in. */
export async function getMySignIn(): Promise<{
  hasPassword: boolean;
  googleAccountId: string | null;
  deviceCount: number;
}> {
  await assertSignedIn();
  const requestHeaders = await headers();
  const [methods, devices] = await Promise.all([
    auth.api.listUserAccounts({ headers: requestHeaders }),
    auth.api.listSessions({ headers: requestHeaders }),
  ]);
  return {
    hasPassword: methods.some((method) => method.providerId === "credential"),
    googleAccountId: methods.find((method) => method.providerId === "google")?.id ?? null,
    deviceCount: devices.length,
  };
}

// ============================================================================
// ACCOUNT CHANGES
// ============================================================================

/** Same number regardless of formatting ("305-555-0100" vs "+13055550100"). */
function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ? formatPhoneNumberE164(a) : null) === (b ? formatPhoneNumberE164(b) : null);
}

/**
 * Update any subset of the editable account fields. The merged record is
 * validated as a whole (so a required name can't be blanked), but only the
 * keys that were passed are written. Email changes go through
 * requestMyEmailChange, which confirms the new address first.
 */
export async function updateMyAccount(input: Partial<ProfileFormValues>): Promise<void> {
  const me = await assertSignedIn();
  const { email: _ignoredEmail, ...changes } = input;

  const current = await profileService.getAccount(me.id);
  if (!current) throw new UserFacingError("Account not found", 404);

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
  if (!parsed.success) throw new InvalidFields(fieldErrorsOf(parsed.error));

  // Only what the caller sent; empty strings clear optional columns. Phones
  // are stored as +1XXXXXXXXXX: phone sign-in and booking matching look them
  // up that way.
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(changes) as (keyof ProfileFormValues)[]) {
    const value = parsed.data[key];
    patch[key] = value === "" ? null : key === "phoneNumber" && value ? formatPhoneNumberE164(value) : value;
  }
  if (Object.keys(patch).length === 0) return;

  // A new phone is unproven until it's verified again. Keeping the old flag
  // would let someone switch to another person's number and claim their
  // guest bookings.
  if ("phoneNumber" in patch && !samePhone(patch.phoneNumber as string | null, current.phoneNumber)) {
    patch.phoneVerified = false;
  }
  // The display name follows first + last name.
  if ("firstName" in patch || "lastName" in patch) {
    patch.name = displayName(
      "firstName" in patch ? (patch.firstName as string | null) : current.firstName,
      "lastName" in patch ? (patch.lastName as string | null) : current.lastName,
      current.email
    );
  }
  await profileService.updateAccount(me.id, patch);
}

/**
 * Change the sign-in email the safe way (Better Auth's change-email flow):
 * nothing changes until the person opens a link sent to the NEW address, and
 * a verified account first approves from its CURRENT address. An address that
 * already has an account gets the same answer, so this can't be used to
 * discover who has an account. Returns what to tell the person.
 */
export async function requestMyEmailChange(input: Partial<ProfileFormValues>): Promise<string> {
  const me = await assertSignedIn();
  const parsed = emailSchema.safeParse(input.email?.trim() ?? "");
  if (!parsed.success) {
    throw new InvalidFields({ email: [parsed.error.issues[0]?.message ?? "Enter a valid email"] });
  }
  const newEmail = parsed.data.toLowerCase();
  if (newEmail === me.email) return "That's already your email.";

  try {
    await auth.api.changeEmail({
      body: { newEmail, callbackURL: "/profile/settings?verified=1" },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.message) throw new UserFacingError(error.body.message);
    throw error;
  }
  return me.emailVerified
    ? `To keep your account safe, approve the change from your current email first. Then confirm ${newEmail}.`
    : `We sent a link to ${newEmail}. Your email changes once you open it.`;
}

const notificationPreferencesSchema = z
  .object({
    emailNotifications: z.enum(notificationPreferenceEnum.enumValues),
    smsNotifications: z.enum(notificationPreferenceEnum.enumValues),
    marketingEmailsEnabled: z.boolean(),
  })
  .partial();

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

export async function updateMyNotificationPreferences(input: NotificationPreferencesInput): Promise<void> {
  const me = await assertSignedIn();
  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError("Invalid notification setting.");
  await profileService.updateAccount(me.id, parsed.data);
}

const changePasswordSchema = z.object({
  // Empty when the account has no password yet (Google or phone sign-up).
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Change the password, or set a first one for accounts that sign in with
 * Google or a texted code. Changing it signs out every other device.
 */
export async function changeMyPassword(input: ChangePasswordInput): Promise<void> {
  await assertSignedIn();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) throw new InvalidFields(fieldErrorsOf(parsed.error));

  const requestHeaders = await headers();
  const methods = await auth.api.listUserAccounts({ headers: requestHeaders });
  const hasPassword = methods.some((method) => method.providerId === "credential");
  const { currentPassword, newPassword } = parsed.data;
  if (hasPassword && !currentPassword) {
    throw new InvalidFields({ currentPassword: ["Enter your current password"] });
  }

  try {
    if (hasPassword) {
      await auth.api.changePassword({
        body: { currentPassword: currentPassword!, newPassword, revokeOtherSessions: true },
        headers: requestHeaders,
      });
    } else {
      await auth.api.setPassword({ body: { newPassword }, headers: requestHeaders });
    }
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      throw new InvalidFields(
        { currentPassword: ["That current password isn't right."] },
        "That current password isn't right."
      );
    }
    if (error instanceof APIError && error.body?.message) throw new UserFacingError(error.body.message);
    throw error;
  }
}

// ============================================================================
// PAYING FOR A TRIP
// ============================================================================

/**
 * Open Stripe Checkout for one of the person's own booked trips. Before
 * anything is paid they may pick the deposit; after that, "full" charges the
 * remaining balance. Every amount includes its card fee. Returns the URL.
 */
export async function startMyTripPayment(bookingId: string, chargeType: "deposit" | "full"): Promise<string> {
  const trip = await getMyTrip(bookingId);
  if (!trip) throw new UserFacingError("We couldn't find that trip.", 404);
  if (trip.status !== "BOOKED" || trip.offCard || trip.balanceCents <= 0) {
    throw new UserFacingError("This trip isn't awaiting a card payment.");
  }
  if (chargeType === "deposit" && (trip.paidCents > 0 || !trip.depositChargeCents)) {
    throw new UserFacingError("This trip doesn't have a deposit option.");
  }
  return getOrCreateCheckoutUrl(bookingId, { chargeType });
}
