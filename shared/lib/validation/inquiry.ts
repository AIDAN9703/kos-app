import * as z from "zod";
import { bookingRequestSchema } from "@/features/_validation/validations";
import { emailSchema, phoneRequiredSchema } from "./common";

/**
 * Shared inquiry validation schemas
 * Single source of truth for all inquiry forms (Request to Book, Term Charter,
 * boat page). Consumed by features/bookings/booking-request.data.ts.
 */

/** Base contact fields - shared across all inquiry types */
const baseContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: emailSchema,
  phone: phoneRequiredSchema,
});

/** Fuzzy time-of-day preference — mirrors the PreferredTimeOfDay pg enum. */
const preferredTimeOfDaySchema = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "FLEXIBLE",
]);

/** Day charter / Request to Book - date, time-of-day, budget, guests + SMS consent */
export const requestToBookSchema = baseContactSchema.extend({
  date: z.string().optional(),
  timeOfDay: preferredTimeOfDaySchema.optional(),
  budget: z.string().optional(),
  guests: z.string().optional(),
  message: z.string().optional(),
  termsAgreed: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
  // Optional by design (and by the checkbox label) — declining SMS must
  // never block a lead from submitting.
  smsConsent: z.boolean().default(false),
});

/** Term charter - structured fields, stored in real inquiry columns */
export const termCharterInquirySchema = baseContactSchema.extend({
  startDate: z.string().optional(),
  duration: z.string().optional(),
  destination: z.string().optional(),
  guests: z.string().optional(),
  budget: z.string().optional(),
  accommodations: z.string().optional(),
  message: z.string().optional(),
  termsAgreed: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

/**
 * Contact step for SIGNED-IN users: identity comes from the account, so the
 * form only carries notes + terms — and a phone number when the account
 * doesn't have one (e.g. Google sign-ups).
 */
export const boatMemberInquiryContactSchema = z.object({
  phone: z.union([phoneRequiredSchema, z.literal("")]).optional(),
  message: z.string().max(2000).optional(),
  termsAgreed: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

/** Signed-in boat inquiry — trip fields + the slim member contact step. */
export const boatMemberInquirySchema = bookingRequestSchema.merge(
  boatMemberInquiryContactSchema
);

export type RequestToBookFormData = z.infer<typeof requestToBookSchema>;
export type TermCharterFormData = z.infer<typeof termCharterInquirySchema>;
export type BoatMemberInquiryContactFormData = z.infer<typeof boatMemberInquiryContactSchema>;
