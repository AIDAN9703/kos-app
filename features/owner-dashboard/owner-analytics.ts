import { addDays, addMonths, format, startOfMonth } from "date-fns";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import type {
  BoatPerformance,
  MonthlyPoint,
  OwnerAnalytics,
  OwnerBoat,
  OwnerCharter,
  OwnerKpis,
} from "./owner.types";

/**
 * Pure analytics for the owner dashboard, derived from the owner's charters.
 * Dates bucket in each BOAT's own timezone, so a 9pm Miami charter never
 * lands on the next day because the server runs in UTC.
 */

const OCCUPANCY_WINDOW_DAYS = 30;

/** Charters that count toward earnings and activity (cancelled ones don't). */
function isEarning(c: OwnerCharter): boolean {
  return c.status === "BOOKED" || c.status === "COMPLETED";
}

function charterHours(c: Pick<OwnerCharter, "startsAt" | "endsAt">): number {
  return c.endsAt ? Math.max(0, Math.round((c.endsAt.getTime() - c.startsAt.getTime()) / 36e5)) : 0;
}

/** "yyyy-MM-dd" for every boat-local day a charter touches (multi-day trips span several). */
export function charterDayKeys(
  c: Pick<OwnerCharter, "startsAt" | "endsAt" | "timezone">
): string[] {
  const first = formatBoatLocal(c.startsAt, c.timezone, "yyyy-MM-dd");
  if (!c.endsAt) return [first];
  // End is exclusive: a charter ending exactly at midnight doesn't claim the next day.
  const last = formatBoatLocal(new Date(c.endsAt.getTime() - 1), c.timezone, "yyyy-MM-dd");
  // Walk calendar dates at noon UTC so no offset can shift the day.
  const keys: string[] = [];
  for (let d = new Date(`${first}T12:00:00Z`); keys.length < 60; d = addDays(d, 1)) {
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    if (key >= last) break;
  }
  return keys;
}

const sumPayout = (charters: OwnerCharter[]) =>
  charters.reduce((s, c) => s + (c.payoutCents ?? 0), 0);

function isUpcomingCharter(c: OwnerCharter, now: Date): boolean {
  return c.status === "BOOKED" && c.startsAt >= now;
}

function buildKpis(charters: OwnerCharter[], boats: OwnerBoat[], now: Date): OwnerKpis {
  const year = String(now.getFullYear());
  const lastYear = String(now.getFullYear() - 1);
  const todayMonthDay = format(now, "MM-dd");
  const earning = charters.filter(isEarning);
  const thisYear = earning.filter((c) => formatBoatLocal(c.startsAt, c.timezone, "yyyy") === year);
  // Last year up to the same calendar day, so the comparison is like for like.
  const samePeriodLastYear = earning.filter((c) => {
    const local = formatBoatLocal(c.startsAt, c.timezone, "yyyy-MM-dd");
    return local.startsWith(lastYear) && local.slice(5) <= todayMonthDay;
  });

  const windowEnd = addDays(now, OCCUPANCY_WINDOW_DAYS);
  const bookedDays = new Set(
    charters
      .filter(
        (c) => c.status === "BOOKED" && c.startsAt < windowEnd && (c.endsAt ?? c.startsAt) >= now
      )
      .flatMap((c) => charterDayKeys(c).map((day) => `${c.boatId}:${day}`))
  );
  const liveBoats = boats.filter((b) => b.active).length;
  const capacity = liveBoats * OCCUPANCY_WINDOW_DAYS;

  const earnedCents = sumPayout(earning);
  const paidOutCents = earning.reduce((s, c) => s + c.paidOutCents, 0);

  return {
    earningsThisYearCents: sumPayout(thisYear),
    earningsSamePeriodLastYearCents: sumPayout(samePeriodLastYear),
    paidOutCents,
    pendingPayoutCents: Math.max(0, earnedCents - paidOutCents),
    upcomingCharters: charters.filter((c) => isUpcomingCharter(c, now)).length,
    completedThisYear: thisYear.filter((c) => c.status === "COMPLETED").length,
    hoursThisYear: thisYear.reduce((s, c) => s + charterHours(c), 0),
    bookedDaysNext30: bookedDays.size,
    occupancyNext30: capacity > 0 ? Math.round((bookedDays.size / capacity) * 100) : 0,
  };
}

/** The trailing 12 months, oldest first, including the current month. */
function buildMonthly(charters: OwnerCharter[], now: Date): MonthlyPoint[] {
  const months: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(startOfMonth(now), i - 11);
    return {
      key: format(month, "yyyy-MM"),
      label: format(month, "MMM"),
      longLabel: format(month, "MMMM yyyy"),
      earningsCents: 0,
      charters: 0,
    };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const c of charters.filter(isEarning)) {
    const point = byKey.get(formatBoatLocal(c.startsAt, c.timezone, "yyyy-MM"));
    if (!point) continue;
    point.charters += 1;
    point.earningsCents += c.payoutCents ?? 0;
  }
  return months;
}

function buildByBoat(charters: OwnerCharter[], boats: OwnerBoat[], now: Date): BoatPerformance[] {
  const year = String(now.getFullYear());
  const rows = boats.map((boat) => {
    const mine = charters.filter((c) => c.boatId === boat.id);
    const thisYear = mine.filter(
      (c) => isEarning(c) && formatBoatLocal(c.startsAt, c.timezone, "yyyy") === year
    );
    return {
      boatId: boat.id,
      boatName: boat.name,
      charters: thisYear.length,
      hours: thisYear.reduce((s, c) => s + charterHours(c), 0),
      earningsCents: sumPayout(thisYear),
      sharePercent: 0,
      nextCharter: mine.find((c) => isUpcomingCharter(c, now)) ?? null,
    };
  });

  // Share by earnings when payouts are recorded; otherwise by charter count.
  const totalEarnings = rows.reduce((s, r) => s + r.earningsCents, 0);
  const totalCharters = rows.reduce((s, r) => s + r.charters, 0);
  for (const r of rows) {
    r.sharePercent =
      totalEarnings > 0
        ? Math.round((r.earningsCents / totalEarnings) * 100)
        : totalCharters > 0
          ? Math.round((r.charters / totalCharters) * 100)
          : 0;
  }
  return rows.sort((a, b) => b.earningsCents - a.earningsCents || b.charters - a.charters);
}

export function buildOwnerAnalytics(
  charters: OwnerCharter[],
  boats: OwnerBoat[],
  now: Date = new Date()
): OwnerAnalytics {
  return {
    kpis: buildKpis(charters, boats, now),
    monthly: buildMonthly(charters, now),
    byBoat: buildByBoat(charters, boats, now),
    upcoming: charters.filter((c) => isUpcomingCharter(c, now)),
  };
}

/** Upcoming / past / cancelled split for the charters page, each in reading order. */
export function splitCharters(charters: OwnerCharter[], now: Date = new Date()) {
  return {
    upcoming: charters.filter((c) => isUpcomingCharter(c, now)),
    past: charters
      .filter((c) => c.status !== "CANCELLED" && !isUpcomingCharter(c, now))
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()),
    cancelled: charters
      .filter((c) => c.status === "CANCELLED")
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()),
  };
}
