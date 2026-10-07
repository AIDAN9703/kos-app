/** Shapes the admin dashboard shows (from dashboard.data.ts). */

/** One month of charter volume — the last entry is the current month. */
export interface RevenueMonth {
  /** "2026-03" — stable key. */
  key: string;
  /** "Mar" — chart axis label. */
  label: string;
  /** "March" — headline label when this is the current month. */
  monthName: string;
  gmvCents: number;
  /** What KOS keeps: charter value minus every expense line. */
  revenueCents: number;
  trips: number;
}

/** A boat's standing in this month's GMV leaderboard. */
export interface FleetLeader {
  boatId: string;
  name: string;
  mainImage: string | null;
  gmvCents: number;
  trips: number;
}

/** Lean lead row for the dashboard queue — INQUIRY-status booking rows. */
export interface DashboardLead {
  id: string;
  name: string;
  source: string | null;
  budgetCents: number | null;
  estimatedValueCents: number | null;
  createdAt: Date;
}

export interface ActivityItem {
  id: string;
  bookingId: string;
  customerName: string | null;
  eventType: string;
  message: string | null;
  actorType: string;
  createdAt: Date;
}

/* ── Desk (the dashboard rebuilt 2026-10-07) ───────────────────────── */

export type ActionKind =
  | "conflict"
  | "change-request"
  | "stripe"
  | "captain"
  | "balance"
  | "past-due"
  | "lead"
  | "proposal-unpaid"
  | "proposal-unsent"
  | "calendar-sync";

/** One thing the team has to deal with. */
export interface ActionItem {
  key: string;
  kind: ActionKind;
  /** 3 = now, 2 = this week, 1 = when there's time. */
  severity: 1 | 2 | 3;
  /** Customer, calendar or Stripe event the item is about. */
  subject: string;
  boatName: string | null;
  /** The fact that makes it an action, already worded. */
  detail: string;
  tripStart: Date | null;
  timezone: string | null;
  /** When the clock started: lead received, proposal sent, error seen. */
  since: Date | null;
  href: string;
  external?: boolean;
  /** Set on calendar conflicts, so the timeline can mark the same proposals. */
  bookingId?: string;
}

/** A booked trip near today, with what it still lacks. */
export interface DeskTrip {
  id: string;
  customerName: string;
  boatName: string | null;
  timezone: string | null;
  start: Date;
  needsCaptain: boolean;
  dueCents: number;
}

export interface DeskNumbers {
  openProposals: { count: number; valueCents: number };
  owed: { trips: number; dueCents: number };
  totalUsers: number;
  totalBoats: number;
}

export type TimelineKind = "booked" | "proposed" | "block" | "external";

export interface TimelineSegment {
  id: string;
  kind: TimelineKind;
  label: string;
  start: Date;
  end: Date;
  href: string | null;
}

export interface TimelineBoat {
  id: string;
  name: string;
  /** The boat's IANA zone: its row is drawn in boat-local time. */
  timezone: string | null;
  segments: TimelineSegment[];
}
