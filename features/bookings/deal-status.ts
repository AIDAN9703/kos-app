import type { BookingStatus } from "@/database/types";

/** Admin-facing words for the stored statuses. Change words here, nowhere else. */
const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  INQUIRY: "Inquiry",
  PROPOSED: "Proposal",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * The pre-0060 vocabulary still lives in history rows and event payloads
 * (DRAFT / PENDING / APPROVED / CONFIRMED). Read it as today's words so old
 * timeline entries render correctly. This is the ONLY place those names exist.
 */
const LEGACY_STATUS_ALIASES: Record<string, BookingStatus> = {
  DRAFT: "PROPOSED",
  PENDING: "PROPOSED",
  APPROVED: "BOOKED",
  CONFIRMED: "BOOKED",
};

export function canonicalBookingStatus(value: string): string {
  return LEGACY_STATUS_ALIASES[value] ?? value;
}

export function bookingStatusLabel(value: string): string {
  const canonical = canonicalBookingStatus(value) as BookingStatus;
  return BOOKING_STATUS_LABELS[canonical] ?? value;
}

/**
 * Hours before trip start when unresolved pre-trip items (captain, balance)
 * flip from "pending" (yellow) to "urgent" (red).
 */
export const PRETRIP_URGENT_HOURS = 48;

/**
 * True when the trip starts within PRETRIP_URGENT_HOURS — or has already
 * started (a missing captain on a trip that left the dock is past urgent).
 * False when there's no trip date yet.
 */
export function isTripImminent(
  startDateTime: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!startDateTime) return false;
  const msUntilStart = new Date(startDateTime).getTime() - now.getTime();
  return msUntilStart <= PRETRIP_URGENT_HOURS * 60 * 60 * 1000;
}

/** Channel labels (booking.source) for meta lines. */
export const DEAL_SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  ADMIN: "Admin",
  BROKER: "Broker",
  HOME_PAGE: "Home page",
  BOAT_PAGE: "Boat page",
  CONTACT_PAGE: "Contact page",
  TERM_CHARTER_PAGE: "Term charter page",
  PHONE: "Phone",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  BOATSETTER: "Boatsetter",
  GETMYBOAT: "GetMyBoat",
  OTHER: "Other",
};

/**
 * Origin badge tint, grouped by channel family: admin work slate, human
 * channels amber, our own site sky, marketplaces teal, brokers violet.
 */
export const SOURCE_BADGE_CLASSES: Record<string, string> = {
  ADMIN: "bg-slate-400/15 text-slate-300 ring-slate-400/30",
  PHONE: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  INSTAGRAM: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  WHATSAPP: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  WEBSITE: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  HOME_PAGE: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  BOAT_PAGE: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  CONTACT_PAGE: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  TERM_CHARTER_PAGE: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  BOATSETTER: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  GETMYBOAT: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  BROKER: "bg-violet-400/15 text-violet-300 ring-violet-400/30",
  OTHER: "bg-muted text-muted-foreground ring-border",
};

/** Customer's stated time-of-day preference (fuzzy intake). */
export const TIME_OF_DAY_LABELS: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  FLEXIBLE: "Flexible",
};
