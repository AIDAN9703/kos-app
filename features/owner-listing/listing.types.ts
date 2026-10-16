import type { ListingStepId } from "./listing.constants";

export type ListingStatus = "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";

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

  /** Active trip lengths with their guest price in dollars. */
  trips: { hours: number; price: number }[];
  captainArrangement: string | null;
  fuelIncluded: boolean;

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
