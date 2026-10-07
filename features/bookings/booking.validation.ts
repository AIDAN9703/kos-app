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

/** Deal list filters — the admin board and the master list. */
export interface BookingFilterInput {
  page?: number;
  limit?: number;
  search?: string;
  bookingStatus?: (typeof bookingStatusEnum.enumValues)[number];
  paymentStatus?: (typeof PAYMENT_DISPLAY_STATUSES)[number];
  /** Raw types plus the stage-aware pseudo-values over the inquiry family:
   *  "INQUIRY" = still a lead, "BOOKING" = priced past inquiry. */
  bookingType?: (typeof bookingTypeEnum.enumValues)[number] | "INQUIRY" | "BOOKING";
  dateFrom?: string;
  dateTo?: string;
  /** Column sort (default: newest created first). */
  sortBy?: "date" | "gmv";
  sortOrder?: "asc" | "desc";
  boatId?: string;
  bookingGroupId?: string;
  customerId?: string;
  assignedAdminId?: string;
  needsCaptain?: boolean;
  /** Only bookings no admin owns yet ("Unassigned" scope tab). */
  unassignedOnly?: boolean;
  /**
   * Master-list buckets: true = archive bucket only (archivedAt set or
   * CANCELLED); false = live bucket only; undefined = no bucket filter.
   */
  archivedView?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

/** Typed expense line captured at booking creation (amounts in cents). */
export const bookingExpenseLineInputSchema = z.object({
  category: z.enum(bookingExpenseCategoryEnum.enumValues),
  amountCents: z.number().int().min(0, "Expense must be 0 or greater"),
  label: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  source: z.enum(bookingExpenseLineSourceEnum.enumValues).optional(),
});

/** Add-on input schema - matches BookingAddOnInput */
const bookingAddOnSchema = z.object({
  name: z.string().min(1, "Add-on name is required"),
  description: z.string().nullable().optional(),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  quantity: z.number().int().min(1),
});

/**
 * Single booking section - resolved on client (full data per booking)
 * Option C: pricingTierId optional. When null = custom pricing, basePrice + endDateTime required.
 */
const bookingSectionSchema = z
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
 * What bookingService.createBookings takes: createDeal builds it from a
 * parsed createBookingFullSchema, adding the group name and publish flag.
 */
export type CreateBookingsInput = Pick<
  CreateBookingFullInput,
  | "dealId"
  | "numberOfPassengers"
  | "pickupLocation"
  | "dropoffLocation"
  | "adminNotes"
  | "bookings"
  | "sendProposalEmail"
  | "sendProposalSms"
> & {
  groupName?: string | null;
  publishNow?: boolean;
};

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
  // Send options
  sendProposalEmail: z.boolean().optional().default(false),
  sendProposalSms: z.boolean().optional().default(false),
});

export type CreateBookingFullInput = z.infer<typeof createBookingFullSchema>;