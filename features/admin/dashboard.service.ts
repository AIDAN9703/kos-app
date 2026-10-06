import "server-only";

import { db } from "@/database/db";
import { boats, bookingEvents, bookingOps, bookingPricing, bookings, users } from "@/database/schema";
import { and, desc, eq, gte, isNull, lte, notInArray, sql } from "drizzle-orm";
import { cache } from "react";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  subDays,
  subMonths,
} from "date-fns";
import { bookingService } from "@/features/bookings/services/booking.service";
import type { BookingListItem } from "@/features/bookings/booking.types";
import type { RevenueMonth, FleetLeader, DashboardLead, LeadIntake, AdminWorkload, ActivityItem } from "@/features/admin/dashboard.types";

/** Live INQUIRY deals with no admin assigned yet — newest first. */
export const getUnassignedLeads = cache(async (limit = 8): Promise<DashboardLead[]> => {
  const rows = await db
    .select({
      id: bookings.id,
      name: bookings.customerName,
      source: bookings.source,
      budgetCents: bookings.budgetCents,
      estimatedValueCents: bookings.estimatedValueCents,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.bookingStatus, "INQUIRY"),
        isNull(bookings.assignedAdminId),
        isNull(bookings.archivedAt)
      )
    )
    .orderBy(desc(bookings.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    source: r.source,
    budgetCents: r.budgetCents != null ? Number(r.budgetCents) : null,
    estimatedValueCents: r.estimatedValueCents != null ? Number(r.estimatedValueCents) : null,
    createdAt: r.createdAt,
  }));
});

/**
 * Real, dated trips from today forward — the operational spine of the
 * dashboard. One query feeds both the departures board and the money-owed
 * list, so "what's sailing" and "who still owes" can never disagree.
 * Reuses the board's own query, so payment/captain/ops fields come joined.
 */
export const getUpcomingTrips = cache(
  async (daysAhead = 30): Promise<BookingListItem[]> => {
    const now = new Date();
    const result = await bookingService.getAllBookings({
      dateFrom: startOfDay(now).toISOString(),
      dateTo: endOfDay(addDays(now, daysAhead)).toISOString(),
      archivedView: false,
      limit: 100,
    });
    return result.bookings
      // Inquiries carry *requested* dates — they aren't trips yet.
      .filter((b) => b.bookingStatus !== "INQUIRY" && b.startDateTime != null)
      .sort(
        (a, b) =>
          new Date(a.startDateTime as Date).getTime() -
          new Date(b.startDateTime as Date).getTime()
      );
  }
);

/** GMV expression shared by trend + leaderboard: ops override, else quote
 *  total minus the service fee — GMV is fee-exclusive everywhere. */
const ROW_GMV = sql`COALESCE(${bookingOps.gmvCents}, ${bookingPricing.totalAmountCents} - COALESCE(${bookingPricing.serviceFeeCents}, 0))`;
const GMV = sql`COALESCE(SUM(${ROW_GMV}), 0)`;
/** KOS revenue = GMV − expenses (owner payout, fuel, crew, …), per trip summed. */
const REVENUE = sql`COALESCE(SUM(${ROW_GMV} - COALESCE(${bookingOps.expenseCents}, 0)), 0)`;
/** Real trips only — INQUIRY deals aren't booked, CANCELLED aren't happening. */
const REAL_TRIPS = notInArray(bookings.bookingStatus, ["CANCELLED", "INQUIRY"]);

/**
 * Monthly charter volume for the trailing window, oldest first, current month
 * last. Empty months are zero-filled so the chart never has holes, and the
 * final entry doubles as the headline "this month" metrics.
 */
export const getRevenueTrend = cache(async (months = 6): Promise<RevenueMonth[]> => {

  const now = new Date();
  const from = startOfMonth(subMonths(now, months - 1));
  const to = endOfMonth(now);
  const monthExpr = sql`to_char(date_trunc('month', ${bookings.startDateTime}), 'YYYY-MM')`;

  const rows = await db
    .select({
      key: sql<string>`${monthExpr}`,
      gmvCents: sql<number>`${GMV}`,
      revenueCents: sql<number>`${REVENUE}`,
      trips: sql<number>`COUNT(${bookings.id})::int`,
    })
    .from(bookings)
    .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
    .leftJoin(bookingOps, eq(bookings.id, bookingOps.bookingId))
    .where(and(gte(bookings.startDateTime, from), lte(bookings.startDateTime, to), REAL_TRIPS))
    .groupBy(monthExpr);

  const byKey = new Map(rows.map((r) => [r.key, r]));
  return eachMonthOfInterval({ start: from, end: now }).map((month) => {
    const key = format(month, "yyyy-MM");
    const row = byKey.get(key);
    return {
      key,
      label: format(month, "MMM"),
      monthName: format(month, "MMMM"),
      gmvCents: Number(row?.gmvCents ?? 0),
      revenueCents: Number(row?.revenueCents ?? 0),
      trips: Number(row?.trips ?? 0),
    };
  });
});

/** This month's GMV leaderboard by boat — who is actually earning the fleet's keep. */
export const getFleetLeaders = cache(async (limit = 5): Promise<FleetLeader[]> => {

  const now = new Date();
  const rows = await db
    .select({
      boatId: boats.id,
      name: boats.name,
      mainImage: boats.mainImage,
      gmvCents: sql<number>`${GMV}`,
      trips: sql<number>`COUNT(${bookings.id})::int`,
    })
    .from(bookings)
    .innerJoin(boats, eq(bookings.boatId, boats.id))
    .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
    .leftJoin(bookingOps, eq(bookings.id, bookingOps.bookingId))
    .where(
      and(
        gte(bookings.startDateTime, startOfMonth(now)),
        lte(bookings.startDateTime, endOfMonth(now)),
        REAL_TRIPS
      )
    )
    .groupBy(boats.id, boats.name, boats.mainImage)
    .orderBy(desc(sql`4`), desc(sql`5`)) // ordinals: gmvCents, trips
    .limit(limit);

  return rows.map((r) => ({
    boatId: r.boatId,
    name: r.name,
    mainImage: r.mainImage,
    gmvCents: Number(r.gmvCents),
    trips: Number(r.trips),
  }));
});

const LIVE = sql`${bookings.archivedAt} IS NULL`;

/* ── Lead intake ───────────────────────────────────────────────────── */

export const getLeadIntake = cache(async (days = 30): Promise<LeadIntake> => {
  const now = new Date();
  const from = startOfDay(subDays(now, days - 1));
  const prevFrom = startOfDay(subDays(now, days * 2 - 1));
  const dayExpr = sql`to_char(date_trunc('day', ${bookings.createdAt}), 'YYYY-MM-DD')`;

  const [perDay, perSource, [prev]] = await Promise.all([
    db
      .select({ key: sql<string>`${dayExpr}`, count: sql<number>`COUNT(*)::int` })
      .from(bookings)
      .where(gte(bookings.createdAt, from))
      .groupBy(dayExpr),
    db
      .select({ source: bookings.source, count: sql<number>`COUNT(*)::int` })
      .from(bookings)
      .where(gte(bookings.createdAt, from))
      .groupBy(bookings.source)
      .orderBy(desc(sql`COUNT(*)`)),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bookings)
      .where(and(gte(bookings.createdAt, prevFrom), lte(bookings.createdAt, from))),
  ]);

  const byKey = new Map(perDay.map((r) => [r.key, Number(r.count)]));
  const series = eachDayOfInterval({ start: from, end: now }).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { key, label: format(d, "MMM d"), count: byKey.get(key) ?? 0 };
  });

  return {
    days: series,
    bySource: perSource.map((r) => ({ source: r.source ?? "UNKNOWN", count: Number(r.count) })),
    total: series.reduce((a, d) => a + d.count, 0),
    previousTotal: Number(prev?.count ?? 0),
  };
});

/* ── Team workload ─────────────────────────────────────────────────── */

/** Live (non-settled, non-archived) deals per admin, unassigned last. */
export const getAdminWorkload = cache(async (): Promise<AdminWorkload[]> => {
  const rows = await db
    .select({
      adminId: bookings.assignedAdminId,
      firstName: users.firstName,
      lastName: users.lastName,
      liveDeals: sql<number>`COUNT(*)::int`,
      valueCents: sql<number>`COALESCE(SUM(COALESCE(${bookingPricing.totalAmountCents}, ${bookings.estimatedValueCents}, ${bookings.budgetCents})), 0)`,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.assignedAdminId, users.id))
    .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
    .where(and(LIVE, notInArray(bookings.bookingStatus, ["CANCELLED", "COMPLETED"])))
    .groupBy(bookings.assignedAdminId, users.firstName, users.lastName)
    .orderBy(desc(sql`COUNT(*)`));

  return rows
    .map((r) => ({
      adminId: r.adminId,
      name: r.adminId ? [r.firstName, r.lastName].filter(Boolean).join(" ") || "Admin" : "Unassigned",
      liveDeals: Number(r.liveDeals),
      valueCents: Number(r.valueCents),
    }))
    .sort((a, b) => (a.adminId === null ? 1 : b.adminId === null ? -1 : 0));
});

/* ── Activity ──────────────────────────────────────────────────────── */

/** The desk's pulse: the latest events across every deal. */
export const getRecentActivity = cache(async (limit = 12): Promise<ActivityItem[]> => {
  const rows = await db
    .select({
      id: bookingEvents.id,
      bookingId: bookingEvents.bookingId,
      customerName: bookings.customerName,
      eventType: bookingEvents.eventType,
      message: bookingEvents.displayMessage,
      actorType: bookingEvents.actorType,
      createdAt: bookingEvents.createdAt,
    })
    .from(bookingEvents)
    .innerJoin(bookings, eq(bookingEvents.bookingId, bookings.id))
    .orderBy(desc(bookingEvents.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
});
