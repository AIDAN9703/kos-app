import "server-only";

import { and, asc, eq, gt, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { addDays, eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/database/db";
import { boatBlocking, boatExternalCalendarEvents, bookingOps, bookingPricing, bookings } from "@/database/schema";
import { getBoatTimezone } from "@/shared/lib/utils/date-helpers";
import type { BoatShowcaseData, ShowcaseItem } from "@/features/boats/showcase/boat-showcase.types";

/**
 * One boat's operating picture: what's next on its calendar, how full it has
 * been, and what it has earned. Queries only; the data layer checks access.
 */

const DAY = 86_400_000;
/** GMV is fee-exclusive everywhere: ops override, else quote total minus the card fee. */
const GMV = sql<number>`COALESCE(${bookingOps.gmvCents}, ${bookingPricing.totalAmountCents} - COALESCE(${bookingPricing.serviceFeeCents}, 0), 0)`;
const REAL = inArray(bookings.bookingStatus, ["BOOKED", "COMPLETED"]);

export async function getBoatShowcase(boatId: string, timezone: string | null): Promise<BoatShowcaseData> {
  const tz = getBoatTimezone({ timezone });
  const now = new Date();
  const yearStart = new Date(`${formatInTimeZone(now, tz, "yyyy")}-01-01T00:00:00Z`);
  const monthsFrom = startOfMonth(subMonths(now, 11));
  // The dot grid: 13 weeks back to 5 weeks ahead, whole weeks (Mon–Sun).
  const today = new Date(`${formatInTimeZone(now, tz, "yyyy-MM-dd")}T12:00:00Z`);
  const weekday = (today.getUTCDay() + 6) % 7;
  const gridStart = addDays(today, -weekday - 7 * 13);
  const gridEnd = addDays(gridStart, 7 * 18);

  const [upcomingTrips, blocks, events, gridTrips, monthly] = await Promise.all([
    db
      .select({ id: bookings.id, name: bookings.customerName, status: bookings.bookingStatus, start: bookings.startDateTime, end: bookings.endDateTime })
      .from(bookings)
      .where(
        and(
          eq(bookings.boatId, boatId),
          inArray(bookings.bookingStatus, ["BOOKED", "PROPOSED"]),
          isNull(bookings.archivedAt),
          gt(bookings.endDateTime, now),
          lt(bookings.startDateTime, new Date(now.getTime() + 45 * DAY))
        )
      )
      .orderBy(asc(bookings.startDateTime))
      .limit(12),
    db
      .select({ id: boatBlocking.id, reason: boatBlocking.reason, type: boatBlocking.blockingType, start: boatBlocking.startTime, end: boatBlocking.endTime })
      .from(boatBlocking)
      .where(and(eq(boatBlocking.boatId, boatId), gt(boatBlocking.endTime, now), lt(boatBlocking.startTime, new Date(now.getTime() + 45 * DAY))))
      .limit(12),
    db
      .select({ id: boatExternalCalendarEvents.id, summary: boatExternalCalendarEvents.summary, start: boatExternalCalendarEvents.startTime, end: boatExternalCalendarEvents.endTime })
      .from(boatExternalCalendarEvents)
      .where(
        and(
          eq(boatExternalCalendarEvents.boatId, boatId),
          gt(boatExternalCalendarEvents.endTime, now),
          lt(boatExternalCalendarEvents.startTime, new Date(now.getTime() + 45 * DAY))
        )
      )
      .limit(12),
    db
      .select({ status: bookings.bookingStatus, start: bookings.startDateTime, end: bookings.endDateTime })
      .from(bookings)
      .where(
        and(
          eq(bookings.boatId, boatId),
          inArray(bookings.bookingStatus, ["BOOKED", "COMPLETED", "PROPOSED"]),
          isNull(bookings.archivedAt),
          lt(bookings.startDateTime, gridEnd),
          gt(bookings.endDateTime, gridStart)
        )
      ),
    db
      .select({
        key: sql<string>`to_char(date_trunc('month', ${bookings.startDateTime}), 'YYYY-MM')`,
        gmvCents: sql<number>`COALESCE(SUM(${GMV}), 0)`,
        trips: sql<number>`COUNT(*)::int`,
        hours: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${bookings.endDateTime} - ${bookings.startDateTime})) / 3600), 0)`,
      })
      .from(bookings)
      .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
      .leftJoin(bookingOps, eq(bookings.id, bookingOps.bookingId))
      .where(and(eq(bookings.boatId, boatId), REAL, isNull(bookings.archivedAt), gte(bookings.startDateTime, monthsFrom), lt(bookings.startDateTime, endOfMonth(now))))
      .groupBy(sql`1`),
  ]);

  // Next on the calendar: trips, proposals, imported events and blocks, soonest first.
  const upcoming: ShowcaseItem[] = [
    ...upcomingTrips.flatMap((t) =>
      t.start && t.end
        ? [{ id: t.id, kind: t.status === "BOOKED" ? ("booked" as const) : ("proposed" as const), label: t.name, start: t.start, end: t.end, href: `/admin/bookings/${t.id}` }]
        : []
    ),
    ...blocks.map((b) => ({ id: b.id, kind: "block" as const, label: b.reason || String(b.type), start: b.start, end: b.end, href: null })),
    ...events.map((e) => ({ id: e.id, kind: "external" as const, label: e.summary || "Imported event", start: e.start, end: e.end, href: null })),
  ]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 7);

  // Booked hours per boat-local day for the dot grid (a trip counts on the day it
  // starts); proposals mark a day without filling it.
  const hoursByDay = new Map<string, number>();
  const proposedDays = new Set<string>();
  for (const t of gridTrips) {
    if (!t.start || !t.end) continue;
    const dayKey = formatInTimeZone(t.start, tz, "yyyy-MM-dd");
    if (t.status === "PROPOSED") proposedDays.add(dayKey);
    else hoursByDay.set(dayKey, Math.min(24, (hoursByDay.get(dayKey) ?? 0) + (t.end.getTime() - t.start.getTime()) / 3_600_000));
  }
  const todayKey = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const days = Array.from({ length: 7 * 18 }, (_, i) => {
    const key = format(addDays(gridStart, i), "yyyy-MM-dd");
    return { key, hours: Math.round((hoursByDay.get(key) ?? 0) * 10) / 10, proposed: proposedDays.has(key), future: key > todayKey };
  });

  const byMonth = new Map(monthly.map((m) => [m.key, m]));
  const months = eachMonthOfInterval({ start: monthsFrom, end: now }).map((m) => {
    const row = byMonth.get(format(m, "yyyy-MM"));
    return {
      key: format(m, "yyyy-MM"),
      label: format(m, "MMM"),
      gmvCents: Number(row?.gmvCents ?? 0),
      trips: Number(row?.trips ?? 0),
      hours: Math.round(Number(row?.hours ?? 0)),
    };
  });

  const thisYear = months.filter((m) => m.key >= format(yearStart, "yyyy-MM"));
  const tripsYtd = thisYear.reduce((n, m) => n + m.trips, 0);
  const gmvYtd = thisYear.reduce((n, m) => n + m.gmvCents, 0);
  const thisMonth = months[months.length - 1];
  const daysInMonth = Number(formatInTimeZone(endOfMonth(now), tz, "d"));
  const hours90 = days.filter((d) => !d.future).slice(-90).reduce((n, d) => n + d.hours, 0);

  return {
    upcoming,
    days,
    months,
    kpis: {
      tripsYtd,
      gmvYtdCents: gmvYtd,
      avgTripCents: tripsYtd > 0 ? Math.round(gmvYtd / tripsYtd) : 0,
      hours90: Math.round(hours90),
      // Booked share of a 12-hour charter day (8 AM–8 PM), this month.
      utilizationPct: Math.min(100, Math.round(((thisMonth?.hours ?? 0) / (daysInMonth * 12)) * 100)),
    },
  };
}
