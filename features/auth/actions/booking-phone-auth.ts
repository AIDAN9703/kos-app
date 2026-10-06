"use server";

import * as phoneSignIn from "@/features/auth/phone-sign-in.data";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * The booking flow's texted-code sign-in. Thin wrappers over
 * phone-sign-in.data.ts, which checks each code once and throttles attempts.
 */

export async function sendBookingPhoneCode(phoneNumber: string): Promise<ActionResponse<null>> {
  try {
    await phoneSignIn.sendSignInCode(phoneNumber);
    return { success: true, data: null, message: "Verification code sent successfully" };
  } catch (error) {
    return actionError(error, "Failed to send verification code");
  }
}

/** A known number signs in; a new one gets `signUpProof` for the profile step. */
export async function verifyBookingPhoneCode(
  phoneNumber: string,
  code: string
): Promise<ActionResponse<{ existingUser: boolean; signUpProof?: string }>> {
  try {
    const result = await phoneSignIn.verifySignInCode(phoneNumber, code);
    return result.signedIn
      ? { success: true, data: { existingUser: true }, message: "Signed in successfully" }
      : { success: true, data: { existingUser: false, signUpProof: result.signUpProof }, message: "Phone verified" };
  } catch (error) {
    return actionError(error, "Failed to verify phone number");
  }
}

export async function completeBookingPhoneProfile(
  signUpProof: string,
  profile: { firstName: string; lastName: string; email: string }
): Promise<ActionResponse<null>> {
  try {
    await phoneSignIn.completeSignUp(signUpProof, profile);
    return { success: true, data: null, message: "You're all set!" };
  } catch (error) {
    return actionError(error, "Could not create your account");
  }
}
