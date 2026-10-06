"use client";

import { authClient } from "@/shared/lib/auth/auth-client";
import type { SignInData, SignUpData } from "@/features/_validation/validations";
import type { ActionResponse } from "@/shared/lib/types/types";
import { safeRedirectPath } from "./safe-redirect";

/**
 * Email sign-in, sign-up and Google, called from the browser so every attempt
 * goes through Better Auth's endpoint and its shared rate limit.
 */

type AuthError = { code?: string; message?: string; status: number };

function authErrorMessage(error: AuthError, fallback: string): string {
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Sign in instead.";
    case "BANNED_USER":
      return "This account is suspended. Contact us if you think that's a mistake.";
    default:
      return error.message || fallback;
  }
}

export async function signInWithEmail(
  data: SignInData
): Promise<ActionResponse<{ message: string }>> {
  const { error } = await authClient.signIn.email({
    email: data.email.trim().toLowerCase(),
    password: data.password,
  });
  if (error) return { success: false, error: authErrorMessage(error, "Couldn't sign you in.") };
  return { success: true, data: { message: "You're signed in." } };
}

export async function signUpWithEmail(
  data: SignUpData
): Promise<ActionResponse<{ message: string }>> {
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const { error } = await authClient.signUp.email({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    phoneNumber: data.phoneNumber || undefined,
  });
  if (error) return { success: false, error: authErrorMessage(error, "Couldn't create your account.") };
  return {
    success: true,
    data: { message: "Account created. We've sent a link to confirm your email." },
  };
}

/** Full-page redirect to Google; comes back to `callbackUrl` (same-site only). */
export async function continueWithGoogle(callbackUrl: string): Promise<void> {
  const target = safeRedirectPath(callbackUrl);
  await authClient.signIn.social({
    provider: "google",
    callbackURL: target,
    // Better Auth appends ?error=<code> when Google sign-in fails.
    errorCallbackURL: `/sign-in?callbackUrl=${encodeURIComponent(target)}`,
  });
}
