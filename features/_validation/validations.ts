import { z } from "zod";
import { passwordSchema, passwordSignInSchema, phoneRequiredSchema, phoneSchema, emailSchema } from "@/shared/lib/validation/common";

/**
 * Authentication Schemas
 */
export const signUpSchema = z.object({
  firstName: z.string().min(3),
  lastName: z.string().min(3, "Last name must be at least 3 characters"),
  email: emailSchema,
  phoneNumber: phoneRequiredSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});



export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSignInSchema,
  rememberMe: z.boolean().optional(),
});

/**
 * Profile Update Schema
 */
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50).nullable(),
  lastName: z.string().min(1, "Last name is required").max(50).nullable(),
  email: emailSchema,
  phoneNumber: phoneSchema,
  bio: z.string().max(500, "Bio must be less than 500 characters").optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  profileImage: z.union([
    z.string().url("Invalid URL format"),
    z.string().length(0), // Allow empty string
    z.null(), // Allow null
  ]).optional().nullable(),
});

/**
 * Simplified Booking Schema using Pricing Tiers
 * Users select from exact pricing tiers instead of arbitrary hours
 */
export const bookingRequestSchema = z.object({

    // Core booking data
  // startDate and startTime are removed.
  // We now expect startDateTime as a string (ISO 8601 with timezone)
  startDateTime: z.string({ required_error: "Start date and time are required" })
    .datetime({ message: "Invalid date and time format" }), // Zod's .datetime() validates ISO 8601 strings

  // endDateTime is derived server-side from pricingTierId + startDateTime.
  pricingTierId: z.string().min(1, "Please select a duration option"),
  numberOfPassengers: z.number().min(1, "At least one passenger is required"),
  needsCaptain: z.boolean(),

  // Optional customer-selected add-ons (ids + qty only; prices resolved server-side).
  addOns: z
    .array(
      z.object({
        addOnId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .optional(),
});

// Export type for use in components
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type ProfileFormValues = z.infer<typeof profileUpdateSchema>;

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;


