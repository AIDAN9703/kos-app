import type { TripSummary } from "./profile.types";

/**
 * KOS Points — the customer loyalty balance shown on the profile overview.
 *
 * Points are DERIVED, never stored: 1 point per dollar actually paid on a
 * completed charter, read from the payments ledger via each trip's paidCents.
 * Nothing to migrate, nothing to drift. Redemption is handled by the
 * concierge for now (there is no self-serve redemption flow yet).
 *
 * PROGRAM TERMS ARE PLACEHOLDERS pending business sign-off — the earn and
 * credit rates live here and only here, so changing them is a one-file edit.
 */

export const POINTS_PER_DOLLAR = 1;

/** Charter credit per redemption block: 1,000 points = $50 off a future charter. */
export const REDEMPTION = { points: 1_000, creditDollars: 50 } as const;

export interface LoyaltySummary {
  /** Lifetime points earned on completed charters. */
  points: number;
  /** Points that land when booked trips are completed. */
  pendingPoints: number;
  /** Whole redemption blocks available, as dollars of charter credit. */
  creditAvailableDollars: number;
  /** Points still needed for the next block of credit. */
  pointsToNextCredit: number;
  /** 0–100 progress through the current block toward the next credit. */
  progressPercent: number;
}

function pointsFor(trip: TripSummary): number {
  return Math.floor((trip.paidCents / 100) * POINTS_PER_DOLLAR);
}

/** Pure: everything the points card and its explainer show, from the customer's trips. */
export function summarizeLoyalty(trips: TripSummary[]): LoyaltySummary {
  const points = trips
    .filter((t) => t.status === "COMPLETED")
    .reduce((sum, t) => sum + pointsFor(t), 0);
  const pendingPoints = trips
    .filter((t) => t.status === "BOOKED")
    .reduce((sum, t) => sum + pointsFor(t), 0);
  const intoBlock = points % REDEMPTION.points;

  return {
    points,
    pendingPoints,
    creditAvailableDollars: Math.floor(points / REDEMPTION.points) * REDEMPTION.creditDollars,
    pointsToNextCredit: REDEMPTION.points - intoBlock,
    progressPercent: Math.round((intoBlock / REDEMPTION.points) * 100),
  };
}
