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

/** Money that moved: a payment, refund, failed charge or card dispute. */
export interface ActivityItem {
  id: string;
  bookingId: string;
  customerName: string;
  kind: "paid" | "refund" | "failed" | "dispute";
  amountCents: number | null;
  /** "deposit · card" for payments; the dispute's own wording for disputes. */
  detail: string | null;
  at: Date;
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

/** The top bar's bell: the action queue's size and its most urgent items. */
export interface Notifications {
  total: number;
  urgent: number;
  items: ActionItem[];
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
  owed: { trips: number; dueCents: number };
  totalUsers: number;
  totalBoats: number;
}
