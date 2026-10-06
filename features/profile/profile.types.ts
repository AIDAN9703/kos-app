import type { BookingStatus, CaptainProfile, User } from "@/database/types";
import type { ActionResponse } from "@/shared/lib/types/types";

/**
 * Customer-facing profile section (/profile). Everything here is what the
 * signed-in person sees about THEIR OWN account and trips — never another
 * customer's data. Admin views of the same rows live in features/bookings
 * and features/users.
 */

/** The person's own account, as the profile screens show and edit it. */
export type AccountUser = Pick<
  User,
  | "id"
  | "firstName"
  | "lastName"
  | "email"
  | "emailVerified"
  | "phoneNumber"
  | "phoneVerified"
  | "profileImage"
  | "username"
  | "bio"
  | "address"
  | "city"
  | "state"
  | "postalCode"
  | "country"
  | "emailNotifications"
  | "smsNotifications"
  | "marketingEmailsEnabled"
  | "createdAt"
>;

/** One booking as the customer sees it: boat, when, and where the money stands. */
export interface TripSummary {
  id: string;
  status: BookingStatus;
  boatId: string | null;
  boatName: string;
  boatCategory: string | null;
  boatImage: string | null;
  /** IANA zone of the boat — trip times always render in this zone. */
  timezone: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  guests: number | null;
  pickupLocation: string | null;
  needsCaptain: boolean;
  /** What the customer owes in total (card fee excluded when it was waived). */
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  /** What the deposit costs by card (deposit + its card fee); null = no deposit option. */
  depositChargeCents: number | null;
  /** Being settled off-card — no card payment is offered. */
  offCard: boolean;
  /** Set once a proposal was sent; links to the public proposal page. */
  publicToken: string | null;
  createdAt: Date;
}

export interface TripDetail extends TripSummary {
  dropoffLocation: string | null;
  specialRequests: string | null;
  occasionType: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  currency: string;
}

/** A trip the customer needs to act on, shown as a to-do card on the overview. */
export type AttentionItem =
  | { kind: "proposal"; trip: TripSummary }
  | { kind: "balance"; trip: TripSummary };

export interface ProfileOverview {
  /** The soonest booked trip with a date, if any. */
  nextTrip: TripSummary | null;
  /** Every other upcoming trip, soonest first. */
  moreUpcoming: TripSummary[];
  attention: AttentionItem[];
  stats: TripStats;
}

/** Lifetime numbers from completed charters, for the overview stat tiles. */
export interface TripStats {
  tripsCompleted: number;
  hoursOnWater: number;
  guestsHosted: number;
  boatsSailed: number;
}

export interface ProfileCompletionItem {
  key: "photo" | "phone" | "city" | "bio";
  label: string;
  done: boolean;
  /** Settings anchor that fixes it. */
  href: string;
}

/** A booked trip this captain is assigned to. */
export interface CaptainAssignment {
  id: string;
  boatName: string;
  boatImage: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  timezone: string | null;
  guests: number | null;
  pickupLocation: string | null;
}

export interface CaptainSummary {
  profile: Pick<
    CaptainProfile,
    | "status"
    | "uscgLicensed"
    | "licenseType"
    | "licenseExpiry"
    | "totalTripsCompleted"
    | "yearsExperience"
  >;
  upcoming: CaptainAssignment[];
  completedCount: number;
}

/** Shape every profile server action resolves to. */
/** What the profile's inline editors get back: a message, or errors per field. */
export type ActionResult = ActionResponse<null>;
