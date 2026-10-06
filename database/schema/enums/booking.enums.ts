import { pgEnum } from "drizzle-orm/pg-core";

// Booking type — how the deal ENTERED. A deal keeps its entry type for life
// (a boat inquiry that pays stays a "Boat inquiry" booking); the lifecycle
// lives in bookingStatus.
export const bookingTypeEnum = pgEnum("BookingType", [
  "REQUEST", // Standard booking request that needs approval (legacy path)
  "INSTANT_BOOK", // Instant booking (no approval needed)
  "EXTERNAL_BOOKING", // Admin-created external booking
  "GENERAL_QUOTE", // Home/contact-page quote inquiry
  "BOAT_REQUEST", // Inquiry about a specific boat
  "TERM_CHARTER", // Multi-day term-charter inquiry
  "MULTI_DAY", // Reserved for multi-day bookings (not built yet)
  "MANUAL", // Admin-logged lead (phone/DM/walk-in)
  "MARKETPLACE", // Ingested from a marketplace (Boatsetter/GetMyBoat)
]);

// Booking status — ONE deal lifecycle, each value answering "where does the
// customer stand with this trip?". Contacted / sent / paid are DERIVED
// (firstContactedAt, publishedAt, the payments ledger), never stored.
// Migration 0060 mapped the old vocabulary: DRAFT + PENDING → PROPOSED,
// APPROVED + CONFIRMED → BOOKED.
export const bookingStatusEnum = pgEnum("BookingStatus", [
  "INQUIRY", // They asked. Nothing priced yet.
  "PROPOSED", // Priced and on their link (publishedAt says whether it was sent).
  "BOOKED", // The trip is theirs — date locked, calendar blocked. Paid or not.
  "COMPLETED", // The trip happened.
  "CANCELLED", // It didn't — cancellationReason says why (lost inquiries included).
]);

// Booking source — the CHANNEL the deal came through.
export const bookingSourceEnum = pgEnum("BookingSource", [
  "WEBSITE", // Customer booked via website checkout
  "ADMIN", // Admin created
  "BROKER", // Created by external broker
  "HOME_PAGE", // Home-page quote form
  "BOAT_PAGE", // Boat detail page inquiry form
  "CONTACT_PAGE", // Contact page form
  "TERM_CHARTER_PAGE", // Term-charter landing form
  "PHONE", // Called in
  "INSTAGRAM", // DM
  "WHATSAPP", // WhatsApp message
  "BOATSETTER", // Marketplace
  "GETMYBOAT", // Marketplace
  "OTHER",
]);

// Admin note type - categorizes internal notes
export const adminNoteTypeEnum = pgEnum("AdminNoteType", [
  "GENERAL", // General note
  "CONTACTED", // Customer was contacted
  "FOLLOW_UP", // Follow-up needed
  "ISSUE", // Problem or concern
]);

// ============================================================================
// DEAL INTAKE / TIMELINE ENUMS
// (relocated from the retired inquiry.enums.ts — used by booking + booking_event
//  + inbound_email; not inquiry-specific)
// ============================================================================

/** Fuzzy time-of-day preference for leads without an exact requested time. */
export const preferredTimeOfDayEnum = pgEnum("PreferredTimeOfDay", [
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "FLEXIBLE",
]);

/** How a customer was reached (booking_event contact log). */
export const contactMethodEnum = pgEnum("ContactMethod", [
  "EMAIL",
  "PHONE",
  "SMS",
  "IN_PERSON",
  "OTHER",
]);

/** Lifecycle of an ingested marketplace notification email. */
export const inboundEmailParseStatusEnum = pgEnum("InboundEmailParseStatus", [
  "PENDING",
  "PARSED",
  "FALLBACK_LLM",
  "FAILED",
  "IGNORED",
]);

export type PreferredTimeOfDay = (typeof preferredTimeOfDayEnum.enumValues)[number];
