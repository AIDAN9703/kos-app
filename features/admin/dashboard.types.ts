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

/** New deals landing per day and per channel — where business comes from. */
export interface LeadIntake {
  days: { key: string; label: string; count: number }[];
  bySource: { source: string; count: number }[];
  total: number;
  previousTotal: number;
}

export interface AdminWorkload {
  adminId: string | null;
  name: string;
  liveDeals: number;
  /** Value of their open deals (quote total, else lead estimate). */
  valueCents: number;
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
