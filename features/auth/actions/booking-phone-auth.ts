"use server";

import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { signIn } from "@/auth";
import { db } from "@/database/db";
import { claimGuestBookingsForUser } from "@/features/users/claim-guest-bookings";
import { users } from "@/database/schema";
import { sendOtpToPhoneNumber, verifyGuestPhoneCode } from "@/features/auth/actions/verification";
import { createPhoneBookingProof } from "@/shared/lib/auth/phone-booking-proof";
import { ActionResponse } from "@/shared/lib/types/types";
import { formatPhoneNumberE164 } from "@/shared/lib/utils/general-utils";
import { checkVerification } from "@/shared/lib/services/twilio.service";

/** Next.js signals redirects by throwing — those must propagate. */
function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
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
    const proof = createPhoneBookingProof(account.id, formattedPhone);
    // NextAuth v5: signIn THROWS on failure and returns a redirect URL string
    // on success — checking `"error" in result` was an 'in'-on-string crash.
    try {
      await signIn("phone-booking", { proof, redirect: false });
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      console.error("Phone sign-in failed:", error);
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
    const proof = createPhoneBookingProof(account.id, formattedPhone);
    await signIn("phone-booking", { proof, redirect: false });
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

  const generatedPassword = randomUUID();
  const hashedPassword = await hash(generatedPassword, 10);
  const username = `${email.split("@")[0]}_${Math.floor(Math.random() * 10000)}`;

  try {
    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        username,
        password: hashedPassword,
        phoneNumber: formattedPhone,
        phoneVerified: true,
      })
      .returning({ id: users.id });
    // Phone is OTP-verified — adopt any guest bookings made with this number.
    if (newUser?.id) {
      claimGuestBookingsForUser(newUser.id).catch((err) =>
        console.error("Guest-booking claim failed:", err)
      );
    }
  } catch (error) {
    console.error("completeBookingPhoneProfile:", error);
    return { success: false, error: "Could not create your account" };
  }

  try {
    await signIn("credentials", {
      email,
      password: generatedPassword,
      redirect: false,
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Post-signup sign-in failed:", error);
    return { success: false, error: "Account created but sign-in failed. Try signing in." };
  }

  return {
    success: true,
    data: { message: "You're all set!" },
  };
}
