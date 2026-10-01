"use server"

import { eq } from "drizzle-orm";
import { db } from "@/database/db";
import { users } from "@/database/schema";
import { hash } from "bcryptjs";
import { signIn } from "@/auth";
import { ActionResponse } from "@/shared/lib/types/types";
import { formatPhoneNumberE164 } from '@/shared/lib/utils/general-utils';
import { SignInData, SignUpData } from "@/features/_validation/validations";
import { checkRateLimit, getClientIp } from "@/shared/lib/utils/rate-limit";

export const signInAction = async (
  params: SignInData
): Promise<ActionResponse<{ message: string; redirectUrl?: string }>> => {
  const { email, password } = params;

  // Throttle credential stuffing: per-account and per-IP windows.
  const ip = await getClientIp();
  const perEmail = checkRateLimit(`sign-in:email:${email.toLowerCase()}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const perIp = checkRateLimit(`sign-in:ip:${ip}`, {
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (!perEmail.allowed || !perIp.allowed) {
    return { success: false, error: "Too many sign-in attempts. Please try again later." };
  }

  try {
    // Simple sign in - no phone verification checks
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { message: "User signed in successfully" } };
  } catch (error) {
    console.log(error, "Error signing in with credentials");
    return { success: false, error: "Failed to sign in" };
  }
};

export const signUpAction = async (
  params: SignUpData
): Promise<ActionResponse<{ message: string; redirectUrl?: string }>> => {
  const { firstName, lastName, email, password, phoneNumber } = params;

  const ip = await getClientIp();
  const perIp = checkRateLimit(`sign-up:ip:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!perIp.allowed) {
    return { success: false, error: "Too many accounts created. Please try again later." };
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existingUser.length > 0) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);

  try {
    // Format the phone number to E.164 format (optional)
    const formattedPhoneNumber = phoneNumber ? formatPhoneNumberE164(phoneNumber) : null;
    
    // Auto-generate username from email (same logic as in OAuth flow)
    const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 10000);
    
    // Insert the new user
    await db.insert(users).values({
      firstName,
      lastName,
      username, // Auto-generated username
      email,
      password: hashedPassword,
      phoneNumber: formattedPhoneNumber,
      // phoneVerified defaults to false in schema - no need to set explicitly
    });

    // Sign in the user immediately after account creation
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { 
      success: true, 
      data: { 
        message: "Account created and signed in successfully!"
      } 
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Failed to create user" };
  }
};

