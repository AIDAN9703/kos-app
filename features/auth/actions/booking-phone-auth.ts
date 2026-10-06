"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/database/db";
import { claimGuestBookingsForUser } from "@/features/users/claim-guest-bookings";
import { users } from "@/database/schema";
import { sendOtpToPhoneNumber, verifyGuestPhoneCode } from "@/features/auth/actions/verification";
import { auth } from "@/shared/lib/auth/auth";
import { createPhoneBookingProof } from "@/shared/lib/auth/phone-booking-proof";
import { displayName } from "@/shared/lib/auth/session-user";
import { ActionResponse } from "@/shared/lib/types/types";
import { formatPhoneNumberE164 } from "@/shared/lib/utils/general-utils";
import { checkVerification } from "@/shared/lib/services/twilio.service";

/** Start a session for the account that just proved it owns `phone`. */
async function signInVerifiedPhone(userId: string, phone: string): Promise<boolean> {
  try {
    await auth.api.signInPhoneBooking({
      body: { proof: createPhoneBookingProof(userId, phone) },
      headers: await headers(),
    });
    return true;
  } catch (error) {
    console.error("Phone sign-in failed:", error);
    return false;
  }
}

const SHARED_NUMBER_ERROR =
  "This number is on more than one account. Sign in with your email instead.";

/**
 * The one account that has proven it owns this number. Phone numbers aren't
 * unique and anyone can type any number into their profile, so an unverified
 * match must never sign someone in. Two verified accounts on one number is
 * ambiguous, and we refuse rather than guess.
 */
async function findVerifiedPhoneAccount(
  phone: string
): Promise<{ id: string } | "ambiguous" | null> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phoneNumber, phone), eq(users.phoneVerified, true)))
    .limit(2);
  if (rows.length > 1) return "ambiguous";
  return rows[0] ?? null;
}

export async function sendBookingPhoneCode(
  phoneNumber: string,
): Promise<ActionResponse<{ message: string }>> {
  if (!phoneNumber.trim()) {
    return { success: false, error: "Enter your phone number" };
  }
  return sendOtpToPhoneNumber(phoneNumber);
}

export async function verifyBookingPhoneCode(
  phoneNumber: string,
  code: string,
): Promise<
  ActionResponse<{
    existingUser: boolean;
    message: string;
    proof?: string;
  }>
> {
  if (!phoneNumber.trim() || !code.trim()) {
    return { success: false, error: "Enter your phone number and code" };
  }

  const verifyResult = await verifyGuestPhoneCode(phoneNumber, code);
  if (!verifyResult.success) {
    return { success: false, error: verifyResult.error ?? "Invalid code" };
  }

  const formattedPhone = formatPhoneNumberE164(phoneNumber);
  const account = await findVerifiedPhoneAccount(formattedPhone);
  if (account === "ambiguous") return { success: false, error: SHARED_NUMBER_ERROR };

  if (account) {
    if (!(await signInVerifiedPhone(account.id, formattedPhone))) {
      return { success: false, error: "Could not sign you in. Try email instead." };
    }

    // Freshly OTP-verified phone — adopt any guest bookings on this number.
    claimGuestBookingsForUser(account.id).catch((err) =>
      console.error("Guest-booking claim failed:", err)
    );

    return {
      success: true,
      data: {
        existingUser: true,
        message: "Signed in successfully",
      },
    };
  }

  return {
    success: true,
    data: {
      existingUser: false,
      message: "Phone verified",
    },
  };
}

export async function completeBookingPhoneProfile(
  phoneNumber: string,
  code: string,
  profile: { firstName: string; lastName: string; email: string },
): Promise<ActionResponse<{ message: string }>> {
  const formattedPhone = formatPhoneNumberE164(phoneNumber);
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();
  const email = profile.email.trim().toLowerCase();

  if (!firstName || !lastName || !email) {
    return { success: false, error: "Please fill in all fields" };
  }

  const checkResult = await checkVerification(formattedPhone, code.trim());
  if (!checkResult.success) {
    return { success: false, error: "Code expired or invalid. Request a new code." };
  }

  const account = await findVerifiedPhoneAccount(formattedPhone);
  if (account === "ambiguous") return { success: false, error: SHARED_NUMBER_ERROR };

  if (account) {
    if (!(await signInVerifiedPhone(account.id, formattedPhone))) {
      return { success: false, error: "Could not sign you in. Try email instead." };
    }
    claimGuestBookingsForUser(account.id).catch((err) =>
      console.error("Guest-booking claim failed:", err)
    );
    return { success: true, data: { message: "Signed in successfully" } };
  }

  const existingEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingEmail.length > 0) {
    return {
      success: false,
      error: "An account with this email already exists. Sign in with email instead.",
    };
  }

  // A phone-only account: no password. They sign in with a texted code, or
  // set a password later through "Forgot password".
  let newUserId: string;
  try {
    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        name: displayName(firstName, lastName, email),
        email,
        username: `${email.split("@")[0]}_${Math.floor(Math.random() * 10000)}`,
        phoneNumber: formattedPhone,
        phoneVerified: true,
      })
      .returning({ id: users.id });
    newUserId = newUser.id;
  } catch (error) {
    console.error("completeBookingPhoneProfile:", error);
    return { success: false, error: "Could not create your account" };
  }

  // Phone is OTP-verified — adopt any guest bookings made with this number.
  claimGuestBookingsForUser(newUserId).catch((err) =>
    console.error("Guest-booking claim failed:", err)
  );

  if (!(await signInVerifiedPhone(newUserId, formattedPhone))) {
    return { success: false, error: "Account created but sign-in failed. Try signing in." };
  }

  return {
    success: true,
    data: { message: "You're all set!" },
  };
}
