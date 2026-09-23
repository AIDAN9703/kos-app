import * as z from "zod";
import {
  bookingStatusEnum,
  bookingTypeEnum,
  bookingExpenseCategoryEnum,
  bookingExpenseLineSourceEnum,
} from "@/database/schema";
import { PAYMENT_DISPLAY_STATUSES } from "@/shared/lib/utils/payment-display";

/**
 * The bookingType values behind the "INQUIRY" filter group. Everything that
 * enters as "someone wants to charter" presents as one "Inquiry" kind — the
 * source line and pipeline stage carry the differences.
 */
export const INQUIRY_GROUP_TYPES = [
  "GENERAL_QUOTE",
  "BOAT_REQUEST",
  "MANUAL",
  "EXTERNAL_BOOKING",
  "REQUEST",
] as const;

/**
 * Booking filter/search schema for URL params - Comprehensive filters for admin
 * Uses database enums as single source of truth (matches searchParams).
 */
export const bookingFilterSchema = z.object({
  // Pagination
  page: z.coerce.number().optional(),
  limit: z.coerce.number().max(100).optional(),
  
  // Text search
  search: z.string().optional(),
  
  // Status filters (from database schema)
  bookingStatus: z.enum(bookingStatusEnum.enumValues).optional(),
  paymentStatus: z.enum(PAYMENT_DISPLAY_STATUSES).optional(),
  // Raw types plus the stage-aware pseudo-values over the inquiry family:
  // "INQUIRY" = still a lead, "BOOKING" = priced past inquiry.
  bookingType: z.enum([...bookingTypeEnum.enumValues, "INQUIRY", "BOOKING"]).optional(),
  
  // Date range
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),

  // Column sort (default: newest created first)
  sortBy: z.enum(["date", "gmv"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  
  // Related entities
  boatId: z.string().uuid("Invalid boat ID").optional(),
  bookingGroupId: z.string().uuid("Invalid booking group ID").optional(),
  customerId: z.string().uuid("Invalid customer ID").optional(),
  assignedAdminId: z.string().uuid("Invalid admin ID").optional(),
  
  // Boolean filters
  needsCaptain: z.coerce.boolean().optional(),
  /** Only bookings no admin owns yet ("Unassigned" scope tab). */
  unassignedOnly: z.coerce.boolean().optional(),
  /**
   * Master-list buckets: true = archive bucket only (archivedAt set or
   * CANCELLED); false = live bucket only; undefined = no bucket filter.
   */
  archivedView: z.coerce.boolean().optional(),
  
  // Amount range
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
});

// Inferred type from validation schema
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>;

/** Typed expense line captured at booking creation (amounts in cents). */
export const bookingExpenseLineInputSchema = z.object({
  category: z.enum(bookingExpenseCategoryEnum.enumValues),
  amountCents: z.number().int().min(0, "Expense must be 0 or greater"),
  label: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  source: z.enum(bookingExpenseLineSourceEnum.enumValues).optional(),
});

/** Add-on input schema - matches BookingAddOnInput */
export const bookingAddOnSchema = z.object({
  name: z.string().min(1, "Add-on name is required"),
  description: z.string().nullable().optional(),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  quantity: z.number().int().min(1),
});

/**
 * Single booking section - resolved on client (full data per booking)
 * Option C: pricingTierId optional. When null = custom pricing, basePrice + endDateTime required.
 */
export const bookingSectionSchema = z
  .object({
    boatId: z.string().uuid("Please select a boat"),
    usePricingTier: z.boolean().optional(),
    pricingTierId: z.string().uuid().nullable().optional(),
    basePrice: z.number().min(0, "Base price must be 0 or greater"),
    depositAmount: z.number().min(0).nullable().optional(),
    customerName: z.string().min(1, "Customer name is required"),
    customerEmail: z.string().email("Invalid email"),
    customerPhone: z.string().optional().nullable(),
    userId: z.string().uuid().nullable().optional(),
    startDateTime: z.string().datetime("Please select start date and time"),
    endDateTime: z.string().datetime().nullable().optional(),
    /** Per-boat add-ons — each section carries its own. */
    addOns: z.array(bookingAddOnSchema).optional().default([]),
    /** Per-boat expenses (owner payout, fuel, crew…) — each boat has its own
     *  owner and costs, so these never pool onto the lead booking. */
    expenseLines: z.array(bookingExpenseLineInputSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.usePricingTier) {
        return !!data.pricingTierId && z.string().uuid().safeParse(data.pricingTierId).success;
      }
      return true;
    },
    { message: "Please select a pricing tier or switch to custom pricing", path: ["pricingTierId"] }
  )
  .refine(
    (data) => {
      // Custom pricing (no tier): endDateTime required
      if (!data.pricingTierId) {
        return !!data.endDateTime;
      }
      return true;
    },
    { message: "End date & time required for custom pricing", path: ["endDateTime"] }
  )
  .refine(
    (data) => {
      // Custom pricing (no tier): basePrice required
      if (!data.pricingTierId) {
        return data.basePrice > 0;
      }
      return true;
    },
    { message: "Base price required for custom pricing", path: ["basePrice"] }
  );

/**
 * Unified create bookings schema - one or more bookings in a group
 */
export const createBookingsSchema = z.object({
  /** INQUIRY-status deal being priced — that row is UPGRADED to PROPOSED
   *  in place (same id, same history) instead of a new row. */
  dealId: z.string().uuid().nullable().optional(),
  numberOfPassengers: z.number().int().min(1, "Must have at least 1 passenger"),
  pickupLocation: z.string().nullable().optional(),
  dropoffLocation: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  bookings: z.array(bookingSectionSchema).min(1, "At least one booking is required"),
  groupName: z.string().nullable().optional(),
  allowPayment: z.boolean().optional().default(false),
  sendProposalEmail: z.boolean().optional().default(false),
  sendProposalSms: z.boolean().optional().default(false),
  publishNow: z.boolean().optional(),
});

export type CreateBookingsInput = z.infer<typeof createBookingsSchema>;

/**
 * THE booking-creation schema (used by every door: create page, deal-page
 * proposal modal, dashboard/header modal). One or more boat sections — more
 * than one makes a charter party — plus the financial/ops data (owner payout,
 * other expenses, GMV, source, sales agent) captured up front.
 */
export const createBookingFullSchema = z.object({
  /** INQUIRY-status deal being priced — that row is UPGRADED to PROPOSED
   *  in place (same id, same history) instead of a new row. */
  dealId: z.string().uuid().nullable().optional(),
  bookings: z.array(bookingSectionSchema).min(1, "At least one boat is required"),
  numberOfPassengers: z.number().int().min(1, "Must have at least 1 passenger"),
  pickupLocation: z.string().nullable().optional(),
  dropoffLocation: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  // Deal-level ops attribution (applied to every boat in the party).
  // GMV is NOT accepted from the client — it's derived per boat from that
  // boat's own pricing (charter gross = total − card fee).
  source: z.string().nullable().optional(),
  agentCode: z.string().nullable().optional(),
  // Send options (only the Stripe proposal path is wired today)
  allowPayment: z.boolean().optional().default(false),
  sendProposalEmail: z.boolean().optional().default(false),
  sendProposalSms: z.boolean().optional().default(false),
});

export type CreateBookingFullInput = z.infer<typeof createBookingFullSchema>;