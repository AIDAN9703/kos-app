import type { BookingStatus } from "@/database/types";

/**
 * The owner portal (/owner) — what a boat owner sees about their
 * own fleet. Read-only. Owners never see customer details or what the
 * customer paid; money here is only the owner's payout as recorded by the
 * KOS team. Stripe Connect payouts are not built yet.
 */

/** Charter statuses an owner sees. Inquiries and proposals are KOS's sales pipeline. */
export const OWNER_VISIBLE_STATUSES = [
  "BOOKED",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly BookingStatus[];
export type OwnerCharterStatus = (typeof OWNER_VISIBLE_STATUSES)[number];

/** Who the portal is for — shown in the sidebar. */
export interface OwnerIdentity {
  name: string;
  businessName: string | null;
}

export interface OwnerBoat {
  id: string;
  name: string;
  category: string;
  active: boolean;
  mainImage: string | null;
  locationLabel: string | null;
  timezone: string | null;
  capacity: number;
  lengthFt: number;
  make: string | null;
  model: string | null;
  yearBuilt: number | null;
}

export interface OwnerPricingTier {
  id: string;
  label: string;
  hours: number;
  /** What the guest pays for this tier, in dollars (as listed publicly). */
  guestPriceDollars: number;
  /** The owner's contracted payout for this tier, when the team has set one. */
  ownerPayoutCents: number | null;
}

export interface OwnerBoatDetail extends OwnerBoat {
  description: string | null;
  tiers: OwnerPricingTier[];
}

/** One charter on one of the owner's boats. No customer fields, by design. */
export interface OwnerCharter {
  id: string;
  boatId: string;
  boatName: string;
  timezone: string | null;
  status: OwnerCharterStatus;
  startsAt: Date;
  endsAt: Date | null;
  guests: number | null;
  needsCaptain: boolean;
  pickupLocation: string | null;
  /** Owner payout recorded by the team for this charter; null until confirmed. */
  payoutCents: number | null;
  /** How much of that payout has been sent to the owner. */
  paidOutCents: number;
}

export interface OwnerKpis {
  /** Owner payouts on this year's booked + completed charters. */
  earningsThisYearCents: number;
  /** Same window last year (Jan 1 → today's date), for the year-over-year delta. */
  earningsSamePeriodLastYearCents: number;
  paidOutCents: number;
  /** Recorded payouts not yet sent. */
  pendingPayoutCents: number;
  upcomingCharters: number;
  completedThisYear: number;
  hoursThisYear: number;
  /** Share of live-boat days booked over the next 30 days, 0–100. */
  occupancyNext30: number;
  bookedDaysNext30: number;
}

export interface MonthlyPoint {
  /** "yyyy-MM" in the boat's zone. */
  key: string;
  /** "Oct" — the axis label. */
  label: string;
  /** "October 2026" — the tooltip label. */
  longLabel: string;
  earningsCents: number;
  charters: number;
}

export interface BoatPerformance {
  boatId: string;
  boatName: string;
  charters: number;
  hours: number;
  earningsCents: number;
  /** This boat's share of the fleet's earnings (0–100), or of charters when nothing is recorded. */
  sharePercent: number;
  nextCharter: OwnerCharter | null;
}

export interface OwnerAnalytics {
  kpis: OwnerKpis;
  monthly: MonthlyPoint[];
  byBoat: BoatPerformance[];
  upcoming: OwnerCharter[];
}
