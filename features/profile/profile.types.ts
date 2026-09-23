import type { BookingStatus, CaptainProfile, User } from "@/database/types";

/**
 * Customer-facing profile section (/profile). Everything here is what the
 * signed-in person sees about THEIR OWN account and trips — never another
 * customer's data. Admin views of the same rows live in features/bookings
 * and features/users.
 */

/** The signed-in user's own account row, minus the password hash. */
export type AccountUser = Omit<User, "password">;

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
  depositCents: number | null;
  /** Set once a proposal was sent; links to the public proposal page. */
  publicToken: string | null;
  createdAt: Date;
}

export interface TripDetail extends TripSummary {
  dropoffLocation: string | null;
  specialRequests: string | null;
  occasionType: string | null;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  currency: string;
}

/** Something on the overview page the customer should act on. */
export type AttentionItem =
  | { kind: "proposal"; trip: TripSummary }
  | { kind: "balance"; trip: TripSummary }
  | { kind: "phone" }
  | { kind: "photo" };

export interface ProfileOverview {
  /** The soonest booked trip with a date, if any. */
  nextTrip: TripSummary | null;
  attention: AttentionItem[];
  /** Past trips, newest first, capped for the overview. */
  recentTrips: TripSummary[];
  counts: TripCounts;
}

export interface TripCounts {
  upcoming: number;
  completed: number;
  /** Proposals sent and still awaiting the customer's answer. */
  proposals: number;
}

/** A boat this user owns, as listed on the owner page. */
export interface OwnedBoat {
  id: string;
  name: string;
  displayTitle: string | null;
  category: string;
  active: boolean;
  mainImage: string | null;
  locationLabel: string | null;
  capacity: number;
}

/** An upcoming booked charter on one of the owner's boats (no customer details). */
export interface OwnerCharter {
  id: string;
  boatName: string;
  startsAt: Date | null;
  endsAt: Date | null;
  timezone: string | null;
  guests: number | null;
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
    "status" | "uscgLicensed" | "licenseType" | "licenseExpiry" | "totalTripsCompleted" | "yearsExperience"
  >;
  upcoming: CaptainAssignment[];
  completedCount: number;
}

/** Shape every profile server action resolves to. */
export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
