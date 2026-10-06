import "server-only";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";

import { claimGuestBookingsForUser } from "@/features/users/claim-guest-bookings.service";
import { userService } from "@/features/users/user.service";
import { auth } from "@/shared/lib/auth/auth";
import {
  createPhoneBookingProof,
  createPhoneSignUpProof,
  verifyPhoneSignUpProof,
} from "@/shared/lib/auth/phone-booking-proof";
import { UserFacingError } from "@/shared/lib/errors";
import { checkVerification, sendVerification } from "@/shared/lib/services/twilio.service";
import { formatPhoneNumberE164 } from "@/shared/lib/utils/general-utils";
import { checkRateLimit, getClientIp } from "@/shared/lib/utils/rate-limit";

/**
 * Phone sign-in data layer: the booking flow's "text me a code". The code is
 * checked with Twilio exactly once; a known number signs straight in, a new
 * one gets a short-lived sign-up proof to finish creating the account.
 *
 * Phone numbers aren't unique and anyone can type any number into a profile,
 * so only an account that has VERIFIED the number is ever signed in, and a
 * number verified on two accounts is refused rather than guessed.
 */

const TEN_MINUTES = 10 * 60 * 1000;

function phoneFrom(input: string): string {
  if (!input.trim()) throw new UserFacingError("Enter your phone number");
  return formatPhoneNumberE164(input);
}

/** Text a sign-in code. SMS costs real money, so it's throttled per number and per caller. */
export async function sendSignInCode(rawPhone: string): Promise<void> {
  const phone = phoneFrom(rawPhone);
  const ip = await getClientIp();
  const perPhone = checkRateLimit(`otp-send:phone:${phone}`, { limit: 3, windowMs: TEN_MINUTES });
  const perIp = checkRateLimit(`otp-send:ip:${ip}`, { limit: 10, windowMs: TEN_MINUTES });
  if (!perPhone.allowed || !perIp.allowed) {
    throw new UserFacingError("Too many verification attempts. Please try again in a few minutes.", 409);
  }

  const result = await sendVerification(phone, "sms");
  if (!result.success) {
    console.error("Twilio send failed:", result.error);
    throw new UserFacingError(result.error || "Failed to send verification code");
  }
}

/** The one account that verified this number, or null; refuses a shared number. */
async function verifiedAccountFor(phone: string): Promise<{ id: string } | null> {
  const accounts = await userService.findVerifiedPhoneAccounts(phone);
  if (accounts.length > 1) {
    throw new UserFacingError("This number is on more than one account. Sign in with your email instead.", 409);
  }
  return accounts[0] ?? null;
}

async function signIn(userId: string, phone: string): Promise<void> {
  try {
    await auth.api.signInPhoneBooking({
      body: { proof: createPhoneBookingProof(userId, phone) },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Phone sign-in failed:", error);
    throw new UserFacingError("Could not sign you in. Try email instead.");
  }
  // A freshly verified number adopts the guest bookings made with it.
  claimGuestBookingsForUser(userId).catch((err) => console.error("Guest-booking claim failed:", err));
}

/**
 * Check the code (throttled against guessing). A number with an account
 * signs in; a new number returns the proof completeSignUp needs.
 */
export async function verifySignInCode(
  rawPhone: string,
  rawCode: string
): Promise<{ signedIn: true } | { signedIn: false; signUpProof: string }> {
  const phone = phoneFrom(rawPhone);
  const code = rawCode.trim();
  if (!code) throw new UserFacingError("Enter your phone number and code");

  const attempts = checkRateLimit(`otp-check:phone:${phone}`, { limit: 8, windowMs: TEN_MINUTES });
  if (!attempts.allowed) {
    throw new UserFacingError("Too many attempts. Please request a new code in a few minutes.", 409);
  }
  const check = await checkVerification(phone, code);
  if (!check.success) throw new UserFacingError(check.error || "Invalid verification code");

  const account = await verifiedAccountFor(phone);
  if (account) {
    await signIn(account.id, phone);
    return { signedIn: true };
  }
  return { signedIn: false, signUpProof: createPhoneSignUpProof(phone) };
}

/**
 * Create the account for a number verified moments ago, then sign it in.
 * If an account verified the number in the meantime, that account signs in.
 */
export async function completeSignUp(
  signUpProof: string,
  profile: { firstName: string; lastName: string; email: string }
): Promise<void> {
  const firstName = profile.firstName?.trim() ?? "";
  const lastName = profile.lastName?.trim() ?? "";
  const email = profile.email?.trim().toLowerCase() ?? "";
  if (!firstName || !lastName || !email) throw new UserFacingError("Please fill in all fields");

  const proven = verifyPhoneSignUpProof(signUpProof);
  if (!proven) throw new UserFacingError("That code has expired. Request a new one.");
  const account = await verifiedAccountFor(proven.phone);
  if (account) {
    await signIn(account.id, proven.phone);
    return;
  }

  try {
    const { userId } = await auth.api.signUpPhoneBooking({
      body: { proof: signUpProof, firstName, lastName, email },
      headers: await headers(),
    });
    claimGuestBookingsForUser(userId).catch((err) => console.error("Guest-booking claim failed:", err));
  } catch (error) {
    if (error instanceof APIError && error.body?.message) {
      throw new UserFacingError(error.body.message);
    }
    throw error;
  }
}
