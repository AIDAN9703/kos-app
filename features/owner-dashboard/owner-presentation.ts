import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import type { TripTone } from "@/features/profile/trip-presentation";
import type { OwnerCharter } from "./owner.types";

/** Owner-facing words for a charter's state, in the site's shared status tones. */
export function charterStatus(
  c: OwnerCharter,
  now: Date = new Date()
): { label: string; tone: TripTone } {
  if (c.status === "CANCELLED") return { label: "Cancelled", tone: "destructive" };
  if (c.status === "COMPLETED" || c.startsAt < now) return { label: "Completed", tone: "muted" };
  return { label: "Confirmed", tone: "success" };
}

/** "+18% vs last year" — null when there's nothing to compare against. */
export function yearOverYear(
  current: number,
  previous: number
): { label: string; up: boolean } | null {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { label: `${pct >= 0 ? "+" : ""}${pct}% vs last year`, up: pct >= 0 };
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
