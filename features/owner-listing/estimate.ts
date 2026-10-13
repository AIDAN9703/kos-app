import { takeHome } from "./listing.constants";

/**
 * The "what could my boat earn" estimate on /list-your-boat, worked out in
 * the browser from live KOS boats' public prices. Pure, so the sliders
 * update instantly.
 */

/** One live boat: [type group, length ft, 4h price, 6h price, 8h price] (0 = not offered). */
export type ComparableBoat = [EstimateGroup, number, number, number, number];

/** The four groups we have enough live boats to compare. */
type EstimateGroup = "YACHT" | "PONTOON" | "FISHING" | "OTHER";

/** Boat categories → the four groups we have enough boats to compare. */
export function estimateGroupFor(category: string): EstimateGroup {
  if (category === "YACHT" || category === "PONTOON" || category === "FISHING") return category;
  return "OTHER";
}

const HOURS_INDEX = { 4: 2, 6: 3, 8: 4 } as const;

const MIN_SAMPLE = 5;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

const roundTo50 = (n: number) => Math.round(n / 50) * 50;

export interface Estimate {
  /** How many live KOS boats this is based on. */
  sample: number;
  /** Middle half of guest prices for the trip length. */
  low: number;
  high: number;
  /** Owner's monthly take-home range at the placeholder fee. */
  monthlyLow: number;
  monthlyHigh: number;
}

/**
 * Comparable boats: the same type within ±20% of the length (at least
 * ±6 ft), widened to ±35% and then to every type until there are enough.
 */
export function estimateEarnings(
  boats: ComparableBoat[],
  input: {
    group: EstimateGroup;
    lengthFt: number;
    hours: keyof typeof HOURS_INDEX;
    tripsPerMonth: number;
  }
): Estimate | null {
  const column = HOURS_INDEX[input.hours];
  const priced = boats.filter((b) => b[column] > 0);
  const near = (spread: number) => (b: ComparableBoat) =>
    Math.abs(b[1] - input.lengthFt) <= Math.max(6, input.lengthFt * spread);

  const sameType = priced.filter((b) => b[0] === input.group);
  const list = [
    sameType.filter(near(0.2)),
    sameType.filter(near(0.35)),
    priced.filter(near(0.2)),
    priced.filter(near(0.35)),
  ].find((candidates) => candidates.length >= MIN_SAMPLE);
  if (!list) return null;

  const prices = list.map((b) => b[column]).sort((a, b) => a - b);
  const low = roundTo50(percentile(prices, 0.25));
  const high = roundTo50(percentile(prices, 0.75));
  return {
    sample: list.length,
    low,
    high,
    monthlyLow: roundTo50(takeHome(low) * input.tripsPerMonth),
    monthlyHigh: roundTo50(takeHome(high) * input.tripsPerMonth),
  };
}
