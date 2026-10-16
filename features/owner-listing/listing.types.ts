import type { ListingStepId } from "./listing.constants";

export type ListingStatus = "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";

/** One trip length: the guest price, and the owner's rate (null on tiers from before rates). */
export type ListingTrip = { hours: number; price: number; ownerRate: number | null };

/** One self-listed boat as the owner's listing flow sees it. */
export interface ListingDraft {
  id: string;
  status: ListingStatus;
  active: boolean;
  reviewNote: string | null;
  submittedAt: Date | null;

  category: string;
  make: string | null;
  model: string | null;
  yearBuilt: number | null;
  lengthFt: number;
  capacity: number;

  locationLabel: string | null;
  dockInfo: string | null;
  parkingInfo: string | null;
  timezone: string | null;

  /** Cover first, then the gallery. */
  images: string[];

  name: string;
  displayTitle: string | null;
  description: string | null;
  features: string[];
  sleeps: number | null;
  bathrooms: number | null;

  /** Active trip lengths: what the owner earns and what guests pay, in dollars. */
  trips: ListingTrip[];
  captainArrangement: string | null;
  fuelIncluded: boolean;
  /** KOS's markup on the owner's rates, percent; null means the default. */
  markupPercent: number | null;

  rules: string | null;
  cancellationPolicy: string | null;

  hullId: string | null;
  registrationNumber: string | null;
  insuranceInfo: string | null;
  insuranceExpiry: Date | null;
}

/** A listing in KOS's review queue. */
export interface ListingForReview extends ListingDraft {
  /** The owner account it belongs to, and who to reach there. */
  owner: { id: string; name: string; email: string; phone: string | null };
}

export type StepProgress = Record<Exclude<ListingStepId, "review">, boolean>;
