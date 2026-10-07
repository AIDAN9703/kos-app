import { isTripImminent } from "@/features/bookings/deal-status";
import { effectiveTotalCents } from "@/features/bookings/lib/booking-money";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";

/**
 * "Can this boat leave the dock?" — the ONE definition of pre-trip readiness,
 * shared by the dashboard, the assistant tools, and anything else that needs
 * to say what's still missing. A trip is ready when it has a captain (if it
 * needs one) and no balance outstanding. (A contract check used to live here
 * too, but nothing could ever mark a contract signed, so every trip showed the
 * gap forever — dropped 2026-09-04 until e-signature exists.)
 */
interface ReadinessInput {
  needsCaptain: boolean | null;
  captainUserId: string | null;
  totalAmountCents: number | null;
  serviceFeeCents?: number | null;
  serviceFeeWaived?: boolean | null;
  totalPaidCents: number | null;
  startDateTime: Date | string | null;
}

type ReadinessGap =
  | { kind: "captain"; label: "Captain"; tone: "warning" }
  | { kind: "balance"; label: string; dueCents: number; tone: "destructive" };

export function readinessGaps(trip: ReadinessInput): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];
  if (trip.needsCaptain && !trip.captainUserId) {
    gaps.push({ kind: "captain", label: "Captain", tone: "warning" });
  }
  const total = effectiveTotalCents(trip);
  const due = total - (trip.totalPaidCents ?? 0);
  if (total > 0 && due > 0) {
    gaps.push({ kind: "balance", label: `${formatCentsCompact(due)} due`, dueCents: due, tone: "destructive" });
  }
  return gaps;
}

/** Urgent = inside the pre-trip window with something still missing. */
export function isTripUrgent(trip: ReadinessInput, now = new Date()): boolean {
  return isTripImminent(trip.startDateTime, now) && readinessGaps(trip).length > 0;
}
