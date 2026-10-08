/** One boat's operating picture for the admin boat page (from boat-showcase.data.ts). */

export type ShowcaseKind = "booked" | "proposed" | "external" | "block";

export interface ShowcaseItem {
  id: string;
  kind: ShowcaseKind;
  label: string;
  start: Date;
  end: Date;
  href: string | null;
}

export interface BoatShowcaseData {
  upcoming: ShowcaseItem[];
  /** 18 weeks, Monday first: booked hours per boat-local day. */
  days: { key: string; hours: number; proposed: boolean; future: boolean }[];
  /** Trailing 12 months, current last. */
  months: { key: string; label: string; gmvCents: number; trips: number; hours: number }[];
  kpis: { tripsYtd: number; gmvYtdCents: number; avgTripCents: number; hours90: number; utilizationPct: number };
}
