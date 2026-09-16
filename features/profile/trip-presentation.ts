import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import type { AccountUser, AttentionItem, ProfileOverview, TripCounts, TripSummary } from "./profile.types";

/**
 * Customer-facing words and colours for a trip. The stored status vocabulary
 * (INQUIRY → PROPOSED → BOOKED → COMPLETED / CANCELLED) is admin language;
 * this file translates it into what a guest needs to know, and pairs it with
 * the semantic tone tokens from globals.css. No raw palette colours here.
 */

/** Shown when a booking has no boat photo (undated inquiries, deleted listings). */
export const TRIP_FALLBACK_IMAGE = "/images/herooption22.jpg";

export type TripTone = "neutral" | "accent" | "warning" | "success" | "muted" | "destructive";

export const TRIP_TONE_CLASSES: Record<TripTone, string> = {
  neutral: "bg-muted text-slate-700",
  accent: "bg-gold-soft text-gold-deep",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  muted: "bg-muted text-muted-foreground",
  destructive: "bg-destructive-soft text-destructive",
};

export function tripStatus(trip: TripSummary): { label: string; tone: TripTone } {
  switch (trip.status) {
    case "INQUIRY":
      return { label: "Inquiry received", tone: "neutral" };
    case "PROPOSED":
      return { label: "Proposal ready", tone: "accent" };
    case "BOOKED":
      if (trip.balanceCents <= 0) return { label: "Confirmed", tone: "success" };
      if (trip.paidCents > 0) return { label: "Deposit paid", tone: "warning" };
      return { label: "Payment due", tone: "warning" };
    case "COMPLETED":
      return { label: "Completed", tone: "muted" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "destructive" };
  }
}

/** Open deals (not completed or cancelled) whose date, if set, hasn't passed. */
export function isUpcoming(trip: TripSummary, now: Date = new Date()): boolean {
  if (trip.status === "COMPLETED" || trip.status === "CANCELLED") return false;
  return trip.startsAt === null || trip.startsAt >= now;
}

/** "Sat, Oct 4, 2026" in the boat's zone, or a placeholder for undated inquiries. */
export function tripDate(trip: Pick<TripSummary, "startsAt" | "timezone">): string {
  return trip.startsAt
    ? formatBoatLocal(trip.startsAt, trip.timezone, "EEE, MMM d, yyyy")
    : "Date to be confirmed";
}

/** "10:00 AM – 2:00 PM EDT" in the boat's zone; empty when undated. */
export function tripTimeRange(trip: Pick<TripSummary, "startsAt" | "endsAt" | "timezone">): string {
  if (!trip.startsAt) return "";
  const start = formatBoatLocal(trip.startsAt, trip.timezone, "h:mm a");
  if (!trip.endsAt) return formatBoatLocal(trip.startsAt, trip.timezone, "h:mm a zzz");
  return `${start} – ${formatBoatLocal(trip.endsAt, trip.timezone, "h:mm a zzz")}`;
}

/** "Today", "Tomorrow", "In 9 days" — the countdown Airbnb-style trip cards lead with. */
export function relativeDeparture(trip: Pick<TripSummary, "startsAt">, now: Date = new Date()): string | null {
  if (!trip.startsAt) return null;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(trip.startsAt) - startOfDay(now)) / 864e5);
  if (days < 0) return null;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `In ${days} days`;
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

export function tripDurationHours(trip: Pick<TripSummary, "startsAt" | "endsAt">): number | null {
  if (!trip.startsAt || !trip.endsAt) return null;
  return Math.round((trip.endsAt.getTime() - trip.startsAt.getTime()) / 36e5);
}

export function guestsLabel(guests: number | null): string {
  const n = guests ?? 1;
  return `${n} guest${n === 1 ? "" : "s"}`;
}

/** Newest-first for history, soonest-first for what's ahead. */
export function splitTrips(trips: TripSummary[], now: Date = new Date()) {
  const upcoming = trips
    .filter((t) => isUpcoming(t, now))
    .sort((a, b) => (a.startsAt?.getTime() ?? Infinity) - (b.startsAt?.getTime() ?? Infinity));
  const past = trips
    .filter((t) => !isUpcoming(t, now))
    .sort(
      (a, b) =>
        (b.startsAt?.getTime() ?? b.createdAt.getTime()) -
        (a.startsAt?.getTime() ?? a.createdAt.getTime())
    );
  return { upcoming, past };
}

export function countTrips(trips: TripSummary[], now: Date = new Date()): TripCounts {
  return {
    upcoming: trips.filter((t) => isUpcoming(t, now)).length,
    completed: trips.filter((t) => t.status === "COMPLETED").length,
    proposals: trips.filter((t) => t.status === "PROPOSED" && isUpcoming(t, now)).length,
  };
}

/** Pure: everything the overview page shows, derived from the trip list and account. */
export function buildOverview(
  trips: TripSummary[],
  account: Pick<AccountUser, "phoneNumber" | "profileImage">,
  now: Date = new Date()
): ProfileOverview {
  const { upcoming, past } = splitTrips(trips, now);

  const attention: AttentionItem[] = [];
  for (const trip of upcoming) {
    if (trip.status === "PROPOSED" && trip.publicToken) attention.push({ kind: "proposal", trip });
    else if (trip.status === "BOOKED" && trip.balanceCents > 0) attention.push({ kind: "balance", trip });
  }
  if (!account.phoneNumber) attention.push({ kind: "phone" });
  if (!account.profileImage) attention.push({ kind: "photo" });

  return {
    nextTrip: upcoming.find((t) => t.status === "BOOKED" && t.startsAt !== null) ?? null,
    attention,
    recentTrips: past.slice(0, 3),
    counts: countTrips(trips, now),
  };
}
