/**
 * "List your boat" — the self-serve listing flow.
 *
 * Pricing (Luke, 2026-10) is a net rate: the owner sets what they earn for
 * each trip length; KOS adds its markup on top for the guest price, set per
 * boat in listing review (boat.markup_percent, default 15%), rounded up to
 * $5. A booking keeps the owner's rate as its owner payout.
 */

/** KOS's markup when review hasn't set one for the boat. */
export const DEFAULT_MARKUP_PERCENT = 15;

/** The markups an admin can set (the database checks the same range). */
export const MARKUP_LIMITS = { min: 0, max: 50 } as const;

/** The guest price for an owner's rate: the rate plus KOS's markup, rounded up to $5. */
export function guestPriceFor(ownerRate: number, markupPercent?: number | null): number {
  const markup = markupPercent ?? DEFAULT_MARKUP_PERCENT;
  return Math.ceil((ownerRate * (1 + markup / 100)) / 5) * 5;
}

/**
 * Roughly what the owner earns on a guest price (estimates, and tiers from
 * before owner rates). Rounded down, so guestPriceFor gives the price back.
 */
export function ownerShareOf(guestPrice: number, markupPercent?: number | null): number {
  return Math.floor(guestPrice / (1 + (markupPercent ?? DEFAULT_MARKUP_PERCENT) / 100));
}

/** Trip lengths an owner can price, in hours (Boatsetter uses the same set). */
export const TRIP_LENGTHS = [2, 3, 4, 6, 8] as const;

/** Photos a listing needs before it can go to review. */
export const MIN_PHOTOS = 5;

/** Drafts one person may have open at once. */
export const MAX_OPEN_DRAFTS = 5;

export const LISTING_STEPS = [
  { id: "basics", label: "Your boat", title: "Tell us about your boat" },
  { id: "location", label: "Location", title: "Where does it leave from?" },
  { id: "photos", label: "Photos", title: "Add photos" },
  { id: "details", label: "Description", title: "Describe the experience" },
  { id: "trips", label: "Trips & prices", title: "Trips and prices" },
  { id: "rules", label: "Rules", title: "Rules and cancellations" },
  { id: "documents", label: "Documents", title: "Boat documents" },
  { id: "review", label: "Review", title: "Review and submit" },
] as const;

export type ListingStepId = (typeof LISTING_STEPS)[number]["id"];

export function isListingStep(value: string): value is ListingStepId {
  return LISTING_STEPS.some((step) => step.id === value);
}

export function stepAfter(step: ListingStepId): ListingStepId {
  const i = LISTING_STEPS.findIndex((s) => s.id === step);
  return LISTING_STEPS[Math.min(i + 1, LISTING_STEPS.length - 1)].id;
}

export const listingStepHref = (boatId: string, step: ListingStepId) =>
  `/list-your-boat/${boatId}/${step}`;

/** Boat types an owner picks from, in the order guests think of them. */
export const LISTING_BOAT_TYPES = [
  { value: "YACHT", label: "Yacht", noun: "Yacht" },
  { value: "SPEEDBOAT", label: "Sport boat", noun: "Sport boat" },
  { value: "PONTOON", label: "Pontoon", noun: "Pontoon" },
  { value: "FISHING", label: "Fishing boat", noun: "Fishing boat" },
  { value: "SAILBOAT", label: "Sailboat or catamaran", noun: "Sailboat" },
  { value: "OTHER", label: "Something else", noun: "Boat" },
] as const;

/**
 * A listing's name until the owner gives it one: "2019 Azimut 55 Flybridge",
 * or "2019 Yacht" when the make isn't listed.
 */
export function defaultListingName(boat: {
  yearBuilt: number | string | null;
  make: string | null;
  model: string | null;
  category: string;
}): string {
  const noun = LISTING_BOAT_TYPES.find((t) => t.value === boat.category)?.noun ?? "Boat";
  const what = boat.make ? [boat.make, boat.model] : [noun];
  return [boat.yearBuilt, ...what].filter(Boolean).join(" ");
}

export const CAPTAIN_ARRANGEMENTS = [
  {
    value: "OWNER_CAPTAINS",
    label: "I captain it myself",
    hint: "You hold a USCG captain's license for this boat.",
  },
  {
    value: "OWN_CAPTAIN",
    label: "I have my own captain",
    hint: "A licensed captain who already runs the boat.",
  },
  {
    value: "KOS_CAPTAIN",
    label: "KOS provides the captain",
    hint: "We crew the boat from our captain network.",
  },
] as const;

/** Stored as the sentence itself (boats.cancellation_policy is free text guests read). */
export const CANCELLATION_POLICIES = [
  {
    value: "Flexible: full refund up to 24 hours before the trip.",
    label: "Flexible",
    hint: "Full refund up to 24 hours before.",
  },
  {
    value: "Moderate: full refund up to 5 days before the trip.",
    label: "Moderate",
    hint: "Full refund up to 5 days before.",
  },
  {
    value: "Strict: full refund up to 14 days before the trip.",
    label: "Strict",
    hint: "Full refund up to 14 days before.",
  },
] as const;

/** Common amenities to tick; owners can add their own too. */
export const AMENITIES = [
  "Bluetooth sound system",
  "Air-conditioned cabin",
  "Bathroom",
  "Shower",
  "Galley / kitchen",
  "Flybridge",
  "Bow sun pads",
  "Shade / bimini top",
  "Swim platform",
  "Swim ladder",
  "Cooler and ice",
  "Towels",
  "Floating mat",
  "Paddleboards",
  "Snorkel gear",
  "Tender / jet ski",
] as const;

/** Timezones owners can pick (the boat's local time for trip start times). */
export const LISTING_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (Miami, Fort Lauderdale, New York)" },
  { value: "America/Chicago", label: "Central (Chicago, Texas)" },
  { value: "America/Los_Angeles", label: "Pacific (California)" },
  { value: "America/Nassau", label: "Bahamas" },
] as const;

/** The owner's words for each listing state. */
export const LISTING_STATUS_LABELS = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
} as const;

/** Build years for the year picker, newest first (next model year down to 1960). */
export const BUILD_YEARS = Array.from(
  { length: new Date().getFullYear() + 1 - 1960 + 1 },
  (_, i) => new Date().getFullYear() + 1 - i
);
