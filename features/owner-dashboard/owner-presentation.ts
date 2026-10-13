import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import type { TripTone } from "@/features/profile/trip-presentation";
import type { OwnerBoat, OwnerCharter } from "./owner.types";

/** Owner-facing words for a charter's state, in the site's shared status tones. */
export function charterStatus(
  c: OwnerCharter,
  now: Date = new Date()
): { label: string; tone: TripTone } {
  if (c.status === "CANCELLED") return { label: "Cancelled", tone: "destructive" };
  if (c.status === "COMPLETED" || c.startsAt < now) return { label: "Completed", tone: "muted" };
  return { label: "Confirmed", tone: "success" };
}

/** "$1,250" · "Paid" / "To be paid" — or "Pending" until the team records the payout. */
export function payoutSummary(c: OwnerCharter): { amount: string | null; note: string } {
  if (c.status === "CANCELLED") return { amount: null, note: "—" };
  if (c.payoutCents == null) return { amount: null, note: "Pending" };
  const settled = c.paidOutCents >= c.payoutCents;
  return {
    amount: formatCentsAsWholeDollars(c.payoutCents),
    note: settled
      ? "Paid"
      : c.paidOutCents > 0
        ? `${formatCentsAsWholeDollars(c.paidOutCents)} paid`
        : "To be paid",
  };
}

/** "yacht" → "Yacht", "JET_SKI" → "Jet ski". */
export function categoryLabel(category: string): string {
  const words = category.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type ListingState = Pick<OwnerBoat, "id" | "active" | "managedBy" | "listingStatus">;

/** True while a self-listed boat is still being built or reviewed. */
export function isListingInProgress(boat: ListingState): boolean {
  return boat.managedBy === "OWNER" && boat.listingStatus !== "APPROVED";
}

/** The chip on a boat card: where its listing stands. */
export function listingChip(boat: ListingState): {
  label: string;
  tone: "success" | "warning" | "info" | "muted";
} {
  switch (boat.managedBy === "OWNER" ? boat.listingStatus : "APPROVED") {
    case "DRAFT":
      return { label: "Draft", tone: "muted" };
    case "IN_REVIEW":
      return { label: "In review", tone: "info" };
    case "CHANGES_REQUESTED":
      return { label: "Changes requested", tone: "warning" };
    default:
      if (boat.active) return { label: "Live", tone: "success" };
      return { label: boat.managedBy === "OWNER" ? "Hidden" : "Not listed", tone: "muted" };
  }
}

/** Listings in progress open the listing flow; everything else its portal page. */
export function ownerBoatHref(boat: ListingState): string {
  return isListingInProgress(boat) ? `/list-your-boat/${boat.id}` : `/owner/boats/${boat.id}`;
}
