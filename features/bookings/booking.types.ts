/**
 * Booking Types - Single source of truth for all booking-related types
 *
 * TYPE CATEGORIES:
 * 1. Server Types - Date objects, used in service layer and server components
 * 2. Client Types - ISO strings for dates, used in client components after serialization
 * 3. Form Types - User input types with string dates (forms always produce strings)
 * 4. Display Types - Formatted for specific UI contexts (calendar, profile, etc.)
 *
 * MONEY CONVENTION:
 * - All monetary values in database/service layer are in CENTS (integers)
 * - Types with "Cents" suffix indicate cents values
 * - Display layer converts to dollars using money-utils
 */

import type { PricingTier } from "@/shared/lib/types/types";
import type { Cents } from "@/shared/lib/utils/money-utils";
import type { PaymentDisplayStatus } from "@/shared/lib/utils/payment-display";
import type {
  BookingStatus,
  BookingType,
  BookingSource,
  PaymentStatus,
  PaymentType,
  AdminNoteType,
} from "@/database/types";

// Re-export PricingTier for convenience (also used by boats feature)
export type { PricingTier } from "@/shared/lib/types/types";

// Re-export relevant database types
export type {
  BookingStatus,
  BookingType,
  BookingSource,
  PaymentStatus,
  PaymentType,
  AdminNoteType,
};

// ============================================================================
// NEW STRUCTURED TYPES (Use these going forward)
// All monetary values are in CENTS
// ============================================================================

/**
 * Pricing breakdown in cents - matches booking_pricing table
 */
export interface BookingPricingData {
  basePriceCents: Cents;
  captainFeeCents: Cents | null;
  cleaningFeeCents: Cents | null;
  serviceFeeCents: Cents | null;
  taxAmountCents: Cents | null;
  discountAmountCents: Cents | null;
  discountCode: string | null;
  depositAmountCents: Cents | null;
  totalAmountCents: Cents;
  currency: string;
  depositDueDate: Date | null;
  remainderDueDate: Date | null;
}

/**
 * Payment record - matches payment table
 */
export interface BookingPaymentData {
  id: string;
  paymentType: PaymentType;
  amountCents: Cents;
  currency: string;
  status: PaymentStatus;
  paymentMethodType: string;
  paymentMethodDetail: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentLinkId: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

/**
 * Status history entry
 */
export interface BookingStatusHistoryEntry {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  changedByUserId: string | null;
  changedByName?: string | null;
  reason: string | null;
  createdAt: Date;
}

/**
 * Admin note entry
 */
export interface BookingAdminNoteEntry {
  id: string;
  adminUserId: string;
  adminName?: string | null;
  noteType: AdminNoteType;
  content: string;
  createdAt: Date;
}

/**
 * Add-on stored on a booking (matches booking.add_ons JSON column)
 */
export interface BookingAddOn {
  name: string;
  description?: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
  /** True when offered free/included — shown as "Included", total is 0. */
  isComplimentary?: boolean;
  /** Catalog add_on id this snapshot came from (null for free-text/custom). */
  catalogAddOnId?: string | null;
}

/**
 * Add-on form input (total is computed on save)
 */
export interface BookingAddOnInput {
  name: string;
  description?: string | null;
  unitPrice: number;
  quantity: number;
}

/** Single row from booking_event timeline */
export interface BookingActivityEventEntry {
  id: string;
  actorType: string;
  eventType: string;
  channel: string | null;
  displayMessage: string | null;
  content: string | null;
  contactMethod: string | null;
  metadata: Record<string, unknown> | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  createdAt: Date;
  actorName: string;
}

/**
 * Complete booking with all related data
 * This is the new "full" booking type with nested relations
 */
export interface BookingWithRelations {
  // Core booking info
  id: string;
  bookingType: BookingType;
  bookingStatus: BookingStatus;
  source: BookingSource | null;

  // Customer info
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;

  // Booking details — trip fields null while the deal is an INQUIRY
  boatId: string | null;
  pricingTierId: string | null;
  startDateTime: Date | null;
  endDateTime: Date | null;
  numberOfPassengers: number | null;
  isMultiDay: boolean | null;
  needsCaptain: boolean | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;

  // Admin assignment
  assignedAdminId: string | null;

  // Cancellation info
  cancelledAt: Date | null;
  cancellationReason: string | null;
  cancelledBy: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;

  // Payment configuration
  paymentType: string | null;

  // Add-ons (from booking.add_ons JSON)
  addOns?: Array<{
    name: string;
    description?: string | null;
    unitPrice: number;
    quantity: number;
    total: number;
  }> | null;

  // Related data (from new tables)
  pricing: BookingPricingData | null;
  payments: BookingPaymentData[];
  statusHistory: BookingStatusHistoryEntry[];
  adminNotes: BookingAdminNoteEntry[];
  /** Append-only activity log (status, notes, contacts, Stripe, …) */
  activityEvents: BookingActivityEventEntry[];

  // Joined boat info — null while the deal has no boat chosen (INQUIRY phase)
  boat?: {
    id: string | null;
    name: string;
    category: string | null;
    mainImage: string | null;
    capacity: number | null;
    timezone: string | null;
    ownerId: string | null;
  } | null;

  // Joined user info (customer)
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImage: string | null;
  } | null;

  // Assigned admin info
  assignedAdmin?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

// ============================================================================
// SERVER TYPES (Dates as Date objects - used in service layer & server components)
// ============================================================================

/**
 * Booking list item for admin tables
 * Returned by BookingService.getAllBookings()
 *
 * Note: When passed to client components, dates become ISO strings due to React serialization
 * All monetary values are in CENTS
 */
export interface BookingListItem {
  id: string;
  bookingType: string;
  bookingStatus: string;
  /** Channel the deal came through (bookings.source) — drives the origin line. */
  source: string | null;

  /** Raw status of the most recent payment transaction (DB enum value). */
  paymentStatus: string | null;
  /** Computed booking-level payment status for display (Unpaid, Paid, etc.). */
  paymentDisplayStatus: PaymentDisplayStatus;
  /** Sum of all succeeded, non-refund payments in cents. */
  totalPaidCents: number;
  /** Whether any refund exists for this booking. */
  hasRefund: boolean;

  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  /** Null while the deal is an INQUIRY without a confirmed trip window. */
  startDateTime: Date | null;
  endDateTime: Date | null;
  numberOfPassengers: number | null;

  // Pricing in cents (from booking_pricing)
  totalAmountCents: number;
  /** Fee on top of GMV — needed so GMV fallbacks stay fee-exclusive. */
  serviceFeeCents: number | null;
  /** Card fee waived (paid off-card) — the effective total drops the fee. */
  serviceFeeWaived: boolean;
  currency: string;

  needsCaptain: boolean | null;
  createdAt: Date;

  // Lead-phase fields (unified deal hub — see docs/UNIFIED_BOOKINGS_PLAN.md)
  customerMessage: string | null;
  preferredDate: string | null;
  preferredTimeOfDay: string | null;
  destination: string | null;
  requestedDurationDays: number | null;
  budgetCents: number | null;
  estimatedValueCents: number | null;
  smsConsent: boolean;
  firstContactedAt: Date | null;
  archivedAt: Date | null;

  // Joined boat info
  boatId: string | null;
  pricingTierId: string | null;
  bookingGroupId: string | null;
  bookingGroupName: string | null;
  /** Boats sailing under this booking's group (null when not grouped;
      populated by the board query only). */
  bookingGroupSize?: number | null;
  boatName: string | null;
  boatCategory: string | null;
  boatMainImage: string | null;
  /** Boat's IANA zone — every charter time renders boat-local. */
  boatTimezone: string | null;

  // Joined user info (customer)
  userId: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  userProfileImage: string | null;

  // Assigned admin info
  assignedAdminId: string | null;
  assignedAdminFirstName: string | null;
  assignedAdminLastName: string | null;
  assignedAdminEmail: string | null;

  /** Assigned captain (`bookings.captain_user_id`) — user rows joined for display */
  captainUserId: string | null;
  captainFirstName: string | null;
  captainLastName: string | null;
  captainEmail: string | null;

  // Ops fields (from booking_ops - Excel workflow tracking, all nullable)
  opsExpenseCents?: number | null;
  opsGmvCents?: number | null;
  /** Stored copy of REV (booking total − expense); recomputed on each ops save. */
  opsRevenueCents?: number | null;
  opsPaidCents?: number | null;
  /** Cumulative paid out to boat owner (ops). */
  opsSentToOwnerCents?: number | null;
  /** Stored copy of expense − sent to owner; recomputed on each ops save. */
  opsBalanceOwnerCents?: number | null;
  /** Stored copy of client balance (GMV − PAID); recomputed on save. GMV uses ops field or quote total. */
  opsBalanceClientCents?: number | null;
  opsCrewName?: string | null;
  opsConnected?: boolean | null;
  opsClientPaid?: boolean | null;
  opsCaptainPaid?: boolean | null;
  opsAllPaid?: boolean | null;
  opsSheetsSent?: boolean | null;
  opsAgentCode?: string | null;
  opsCommissionAgentCents?: number | null;
  opsCommissionKosCents?: number | null;
  opsCommissionCents?: number | null;
  opsSourceOverride?: string | null;
}

/**
 * Full booking details for admin detail page
 * Extends BookingListItem with all fields
 * All monetary values are in CENTS
 */
export interface BookingDetails extends BookingListItem {
  pricingTierId: string | null;
  paymentMethod: string | null;
  /** Proposal page shows a pay button when true. */
  allowPayment: boolean;
  /** Channel the deal came through (bookings.source). */
  source: string | null;
  updatedAt: Date;

  // Add-ons snapshot (from booking.add_ons JSON)
  addOns?: BookingAddOn[] | null;

  // Pricing breakdown in cents (from booking_pricing)
  basePriceCents: number | null;
  captainFeeCents: number | null;
  cleaningFeeCents: number | null;
  serviceFeeCents: number | null;
  taxAmountCents: number | null;
  discountAmountCents: number | null;
  depositAmountCents: number | null;

  isMultiDay: boolean | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  expiresAt: Date | null;
  /** Proposal share token — null once the booking is past the proposal stage or never had one. */
  publicToken: string | null;
  /** When the proposal link first went to the customer; null = never sent. */
  publishedAt: Date | null;

  // Extended boat info
  boatCapacity: number | null;
  boatTimezone: string | null;
  boatOwnerId: string | null;
  boatOwnerFirstName: string | null;
  boatOwnerLastName: string | null;
  boatOwnerEmail: string | null;
}

/**
 * Paginated bookings response from API
 */
export interface PaginatedBookingsResponse {
  bookings: BookingListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// FORM TYPES (User input - dates are always strings from form inputs)
// ============================================================================

/**
 * Base booking form data - what the customer fills out
 * Dates are ISO strings because HTML inputs produce strings
 */
export interface BookingFormData {
  startDateTime: string;
  numberOfPassengers: number;
  needsCaptain: boolean;
  pricingTierId: string;
}

/**
 * Complete booking data with boat and pricing info
 * Used during checkout flow
 */
export interface BookingWithDetails {
  startDateTime: string;
  numberOfPassengers: number;
  needsCaptain: boolean;
  boatId: string;
  boat: SafeBoatData;
  selectedTier: PricingTier;
}

/**
 * Safe boat data for booking contexts (minimal boat info)
 * Used in checkout and booking forms
 */
export interface SafeBoatData {
  id: string;
  name: string;
  mainImage: string | null;
  instantBook: boolean;
  cleaningFee: number | null;
  locationLabel: string | null;
  timezone?: string | null;
  /** ISO 4217 currency for this boat's pricing (defaults to "USD" upstream). */
  currency?: string;
}

// ============================================================================
// DISPLAY TYPES (UI-specific, formatted for rendering)
// ============================================================================

/**
 * Calendar event for FullCalendar integration
 * All dates are ISO strings (FullCalendar expects strings)
 */
export interface BookingCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    type?: "booking" | "external";
    bookingId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookingStatus: string;
    bookingType: string;
    numberOfPassengers: number;
    totalAmount: number;
    startTime: string;
    endTime: string;
    createdAt: string;
    boatId?: string;
    boatName?: string;
  };
}


// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface BookingApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Paginated API response with meta
 */
export interface PaginatedBookingApiResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
}
