import "server-only";

import { db } from "@/database/db";
import {
  boatBlocking,
  boatExternalCalendarEvents,
  boatExternalCalendars,
  boats,
  bookingEvents,
  bookingOps,
  bookingPricing,
  bookings,
  stripeEvents,
  users,
} from "@/database/schema";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, notInArray, or, sql } from "drizzle-orm";
import { cache } from "react";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  eachMonthOfInterval,
  format,
  parseISO,
  subMonths,
} from "date-fns";
import { availabilityService } from "@/features/availability/services/availability.service";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import { DEAL_SOURCE_LABELS } from "@/features/bookings/deal-status";
import { effectiveTotalCents } from "@/features/bookings/lib/booking-money";
import { readinessGaps } from "@/features/bookings/lib/trip-readiness";
import { netPaidCentsSql } from "@/features/payments/payment.service";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";
import { bookingService } from "@/features/bookings/services/booking.service";
import type { BookingListItem } from "@/features/bookings/booking.types";
import type {
  ActionItem,
  ActivityItem,
  DashboardLead,
  DeskNumbers,
  DeskTrip,
  FleetLeader,
  RevenueMonth,
  TimelineBoat,
  TimelineKind,
} from "@/features/admin/dashboard.types";

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

/* ── Activity ──────────────────────────────────────────────────────── */

/** Field-level edits and ownership shuffles: noise on a company-wide feed. */
const QUIET_EVENTS = [BOOKING_EVENT_TYPES.UPDATED, BOOKING_EVENT_TYPES.ASSIGNED_ADMIN_CHANGED];

/** The desk's pulse: the latest events that mean something, across every deal. */
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
    .where(notInArray(bookingEvents.eventType, QUIET_EVENTS))
    .orderBy(desc(bookingEvents.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
});

/* ── Desk ───────────────────────────────────────────────────────────── */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Booked trips from 60 days back to 14 days ahead, with money and crew.
 * One query feeds the action queue (balances, captains) and the owed total,
 * so the two never disagree.
 */
const loadDeskTrips = cache(async () => {
  const now = Date.now();
  const rows = await db
    .select({
      id: bookings.id,
      customerName: bookings.customerName,
      boatName: boats.name,
      timezone: boats.timezone,
      start: bookings.startDateTime,
      needsCaptain: bookings.needsCaptain,
      captainUserId: bookings.captainUserId,
      totalAmountCents: bookingPricing.totalAmountCents,
      serviceFeeCents: bookingPricing.serviceFeeCents,
      serviceFeeWaived: bookingPricing.serviceFeeWaived,
      paidCents: netPaidCentsSql(bookings.id),
    })
    .from(bookings)
    .leftJoin(boats, eq(bookings.boatId, boats.id))
    .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
    .where(
      and(
        inArray(bookings.bookingStatus, ["BOOKED", "COMPLETED"]),
        isNull(bookings.archivedAt),
        gte(bookings.startDateTime, new Date(now - 60 * DAY)),
        lte(bookings.startDateTime, new Date(now + 14 * DAY))
      )
    )
    .orderBy(asc(bookings.startDateTime));

  return rows.flatMap((r) => {
    if (!r.start) return [];
    const paid = Number(r.paidCents ?? 0);
    const gaps = readinessGaps({
      needsCaptain: r.needsCaptain,
      captainUserId: r.captainUserId,
      totalAmountCents: r.totalAmountCents,
      serviceFeeCents: r.serviceFeeCents,
      serviceFeeWaived: r.serviceFeeWaived,
      totalPaidCents: paid,
      startDateTime: r.start,
    });
    const balance = gaps.find((g) => g.kind === "balance");
    return [
      {
        id: r.id,
        customerName: r.customerName,
        boatName: r.boatName,
        timezone: r.timezone,
        start: r.start,
        needsCaptain: gaps.some((g) => g.kind === "captain"),
        dueCents: balance?.kind === "balance" ? balance.dueCents : 0,
      } satisfies DeskTrip,
    ];
  });
});

/** Every live proposal (PROPOSED, not archived, trip not yet past). */
const loadOpenProposals = cache(async () => {
  const rows = await db
    .select({
      id: bookings.id,
      customerName: bookings.customerName,
      boatId: bookings.boatId,
      boatName: boats.name,
      timezone: boats.timezone,
      start: bookings.startDateTime,
      end: bookings.endDateTime,
      publishedAt: bookings.publishedAt,
      createdAt: bookings.createdAt,
      totalAmountCents: bookingPricing.totalAmountCents,
      serviceFeeCents: bookingPricing.serviceFeeCents,
      serviceFeeWaived: bookingPricing.serviceFeeWaived,
      paidCents: netPaidCentsSql(bookings.id),
    })
    .from(bookings)
    .leftJoin(boats, eq(bookings.boatId, boats.id))
    .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
    .where(
      and(
        eq(bookings.bookingStatus, "PROPOSED"),
        isNull(bookings.archivedAt),
        or(isNull(bookings.startDateTime), gt(bookings.startDateTime, new Date()))
      )
    )
    .orderBy(asc(bookings.startDateTime))
    .limit(200);
  return rows.map((r) => ({
    ...r,
    totalCents: effectiveTotalCents(r),
    paidCents: Number(r.paidCents ?? 0),
  }));
});

function sourceLabel(source: string | null): string {
  return source ? (DEAL_SOURCE_LABELS[source] ?? source) : "Unknown";
}

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Everything the team has to deal with, most urgent first. Each source is a
 * rule the app already enforces somewhere; this only gathers them:
 * - proposals the customer can't pay because the boat's calendar now
 *   conflicts (the same check the payment page runs);
 * - customer change requests nobody has answered with a resend;
 * - Stripe events that failed to process;
 * - booked trips missing a captain or carrying a balance (trip readiness);
 * - inbound leads nobody has touched;
 * - proposals sent but unpaid, or never sent;
 * - boat calendars whose sync is failing.
 */
export const getActionQueue = cache(async (): Promise<ActionItem[]> => {
  const now = Date.now();
  const [trips, proposals, leads, changes, calendars, stripeFails] = await Promise.all([
    loadDeskTrips(),
    loadOpenProposals(),
    db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        source: bookings.source,
        createdAt: bookings.createdAt,
        preferredDate: bookings.preferredDate,
        passengers: bookings.numberOfPassengers,
        budgetCents: bookings.budgetCents,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.bookingStatus, "INQUIRY"),
          isNull(bookings.archivedAt),
          isNull(bookings.firstContactedAt),
          sql`NOT EXISTS (SELECT 1 FROM booking_event e WHERE e.booking_id = ${bookings.id} AND e.actor_type = 'admin')`
        )
      )
      .orderBy(asc(bookings.createdAt))
      .limit(40),
    db
      .select({
        bookingId: bookingEvents.bookingId,
        customerName: bookings.customerName,
        content: bookingEvents.content,
        createdAt: bookingEvents.createdAt,
        boatName: boats.name,
        timezone: boats.timezone,
        start: bookings.startDateTime,
      })
      .from(bookingEvents)
      .innerJoin(bookings, eq(bookingEvents.bookingId, bookings.id))
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .where(
        and(
          eq(bookingEvents.eventType, BOOKING_EVENT_TYPES.CHANGE_REQUESTED),
          eq(bookings.bookingStatus, "PROPOSED"),
          isNull(bookings.archivedAt),
          gte(bookingEvents.createdAt, new Date(now - 30 * DAY)),
          sql`NOT EXISTS (
            SELECT 1 FROM booking_event later
            WHERE later.booking_id = ${bookingEvents.bookingId}
              AND later.created_at > ${bookingEvents.createdAt}
              AND later.event_type IN (${BOOKING_EVENT_TYPES.PROPOSAL_PUBLISHED}, ${BOOKING_EVENT_TYPES.PROPOSAL_UPDATE_SENT})
          )`
        )
      )
      .orderBy(desc(bookingEvents.createdAt))
      .limit(20),
    db
      .select({
        id: boatExternalCalendars.id,
        name: boatExternalCalendars.name,
        boatId: boatExternalCalendars.boatId,
        boatName: boats.name,
        lastSyncedAt: boatExternalCalendars.lastSyncedAt,
        lastSyncError: boatExternalCalendars.lastSyncError,
      })
      .from(boatExternalCalendars)
      .innerJoin(boats, eq(boatExternalCalendars.boatId, boats.id))
      .where(
        and(
          eq(boatExternalCalendars.syncEnabled, true),
          or(
            isNotNull(boatExternalCalendars.lastSyncError),
            isNull(boatExternalCalendars.lastSyncedAt),
            lt(boatExternalCalendars.lastSyncedAt, new Date(now - 3 * HOUR))
          )
        )
      ),
    db
      .select({
        id: stripeEvents.id,
        type: stripeEvents.type,
        livemode: stripeEvents.livemode,
        lastError: stripeEvents.lastError,
        receivedAt: stripeEvents.receivedAt,
      })
      .from(stripeEvents)
      .where(
        and(
          isNull(stripeEvents.processedAt),
          gte(stripeEvents.receivedAt, new Date(now - 14 * DAY)),
          or(isNotNull(stripeEvents.lastError), lt(stripeEvents.claimedAt, new Date(now - 10 * 60_000)))
        )
      )
      .orderBy(desc(stripeEvents.receivedAt))
      .limit(10),
  ]);

  const items: ActionItem[] = [];
  const href = (id: string) => `/admin/bookings/${id}`;

  // Proposals the customer can't pay: run the payment page's own check.
  const checkable = proposals
    .filter((p) => p.boatId && p.start && p.end)
    .slice(0, 40);
  const checks = await Promise.all(
    checkable.map((p) =>
      availabilityService.checkTimeSlotAvailability(p.boatId!, p.start!, p.end!, p.id)
    )
  );
  const conflicted = new Set<string>();
  checkable.forEach((p, i) => {
    const conflict = checks[i].conflicts[0];
    if (!conflict) return;
    conflicted.add(p.id);
    const what =
      conflict.type === "external"
        ? `Imported calendar: ${conflict.reason}`
        : conflict.type === "blocking"
          ? `Blocked: ${conflict.reason}`
          : conflict.reason;
    items.push({
      key: `conflict-${p.id}`,
      bookingId: p.id,
      kind: "conflict",
      severity: 3,
      subject: p.customerName,
      boatName: p.boatName,
      detail: what,
      tripStart: p.start,
      timezone: p.timezone,
      since: null,
      href: href(p.id),
    });
  });

  const seenChanges = new Set<string>();
  for (const c of changes) {
    const dedupe = `${c.customerName}|${c.content}`;
    if (seenChanges.has(dedupe)) continue; // a party logs one per boat
    seenChanges.add(dedupe);
    items.push({
      key: `change-${c.bookingId}-${c.createdAt.getTime()}`,
      kind: "change-request",
      severity: 3,
      subject: c.customerName,
      boatName: c.boatName,
      detail: c.content ? `“${truncate(c.content, 90)}”` : "Asked for changes",
      tripStart: c.start,
      timezone: c.timezone,
      since: c.createdAt,
      href: href(c.bookingId),
    });
  }

  for (const e of stripeFails) {
    items.push({
      key: `stripe-${e.id}`,
      kind: "stripe",
      severity: 3,
      subject: e.type,
      boatName: null,
      detail: e.lastError ? truncate(e.lastError, 90) : "Stuck mid-processing",
      tripStart: null,
      timezone: null,
      since: e.receivedAt,
      href: `https://dashboard.stripe.com/${e.livemode ? "" : "test/"}events/${e.id}`,
      external: true,
    });
  }

  for (const t of trips) {
    const upcoming = t.start.getTime() >= now;
    const within48h = upcoming && t.start.getTime() - now <= 48 * HOUR;
    if (upcoming && t.needsCaptain) {
      items.push({
        key: `captain-${t.id}`,
        kind: "captain",
        severity: within48h ? 3 : 2,
        subject: t.customerName,
        boatName: t.boatName,
        detail: "No captain assigned",
        tripStart: t.start,
        timezone: t.timezone,
        since: null,
        href: href(t.id),
      });
    }
    if (t.dueCents > 0) {
      items.push({
        key: `balance-${t.id}`,
        kind: upcoming ? "balance" : "past-due",
        severity: within48h ? 3 : 2,
        subject: t.customerName,
        boatName: t.boatName,
        detail: upcoming
          ? `${formatCentsCompact(t.dueCents)} due before the trip`
          : `${formatCentsCompact(t.dueCents)} still owed after the trip`,
        tripStart: t.start,
        timezone: t.timezone,
        since: null,
        href: href(t.id),
      });
    }
  }

  for (const l of leads) {
    const facts = [
      sourceLabel(l.source),
      l.preferredDate ? format(parseISO(l.preferredDate), "MMM d") : null,
      l.passengers ? `${l.passengers} guest${l.passengers === 1 ? "" : "s"}` : null,
      l.budgetCents ? `${formatCentsCompact(Number(l.budgetCents))} budget` : null,
    ].filter(Boolean);
    items.push({
      key: `lead-${l.id}`,
      kind: "lead",
      severity: now - l.createdAt.getTime() > DAY ? 3 : 2,
      subject: l.customerName,
      boatName: null,
      detail: facts.join(" · "),
      tripStart: null,
      timezone: null,
      since: l.createdAt,
      href: href(l.id),
    });
  }

  for (const p of proposals) {
    if (conflicted.has(p.id)) continue;
    const tripSoon = p.start != null && p.start.getTime() - now <= 7 * DAY;
    if (!p.publishedAt) {
      if (now - p.createdAt.getTime() < DAY) continue;
      items.push({
        key: `unsent-${p.id}`,
        kind: "proposal-unsent",
        severity: tripSoon ? 2 : 1,
        subject: p.customerName,
        boatName: p.boatName,
        detail: `Never sent · ${formatCentsCompact(p.totalCents)}`,
        tripStart: p.start,
        timezone: p.timezone,
        since: p.createdAt,
        href: href(p.id),
      });
    } else if (p.paidCents === 0 && (tripSoon || now - p.publishedAt.getTime() > 3 * DAY)) {
      items.push({
        key: `unpaid-${p.id}`,
        kind: "proposal-unpaid",
        severity: tripSoon ? 3 : 2,
        subject: p.customerName,
        boatName: p.boatName,
        detail: `Sent, nothing paid · ${formatCentsCompact(p.totalCents)}`,
        tripStart: p.start,
        timezone: p.timezone,
        since: p.publishedAt,
        href: href(p.id),
      });
    }
  }

  for (const c of calendars) {
    items.push({
      key: `sync-${c.id}`,
      kind: "calendar-sync",
      severity: 2,
      subject: c.name,
      boatName: c.boatName,
      detail: c.lastSyncError ? truncate(c.lastSyncError, 90) : c.lastSyncedAt ? "Hasn't synced in over 3 hours" : "Never synced",
      tripStart: null,
      timezone: null,
      since: c.lastSyncedAt,
      href: `/admin/boats/${c.boatId}/calendar`,
    });
  }

  // Most severe first; inside a level, the soonest trip or the oldest wait.
  const sortAt = (i: ActionItem) => (i.tripStart ?? i.since ?? new Date(now)).getTime();
  return items.sort((a, b) => b.severity - a.severity || sortAt(a) - sortAt(b));
});

/** The numbers row: open proposals, money owed, accounts and fleet size. */
export const getDeskNumbers = cache(async (): Promise<DeskNumbers> => {
  const [proposals, trips, [userCount], [boatCount]] = await Promise.all([
    loadOpenProposals(),
    loadDeskTrips(),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ count: sql<number>`count(*)::int` }).from(boats),
  ]);
  const owed = trips.filter((t) => t.dueCents > 0);
  return {
    openProposals: {
      count: proposals.length,
      valueCents: proposals.reduce((sum, p) => sum + p.totalCents, 0),
    },
    owed: { trips: owed.length, dueCents: owed.reduce((sum, t) => sum + t.dueCents, 0) },
    totalUsers: Number(userCount?.count ?? 0),
    totalBoats: Number(boatCount?.count ?? 0),
  };
});

/**
 * Every active boat's calendar for the coming days: booked trips, open
 * proposals, manual blocks and imported (iCal) events.
 */
export const getFleetTimeline = cache(async (days = 14): Promise<TimelineBoat[]> => {
  const now = Date.now();
  // A little before now so today's earlier trips still show.
  const from = new Date(now - DAY);
  const to = new Date(now + days * DAY);

  const [boatRows, trips, blocks, events] = await Promise.all([
    db
      .select({ id: boats.id, name: boats.name, timezone: boats.timezone })
      .from(boats)
      .where(eq(boats.active, true))
      .orderBy(asc(boats.name)),
    db
      .select({
        id: bookings.id,
        boatId: bookings.boatId,
        customerName: bookings.customerName,
        status: bookings.bookingStatus,
        start: bookings.startDateTime,
        end: bookings.endDateTime,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.bookingStatus, ["BOOKED", "PROPOSED"]),
          isNull(bookings.archivedAt),
          isNotNull(bookings.boatId),
          lt(bookings.startDateTime, to),
          gt(bookings.endDateTime, from)
        )
      ),
    db
      .select({
        id: boatBlocking.id,
        boatId: boatBlocking.boatId,
        reason: boatBlocking.reason,
        type: boatBlocking.blockingType,
        start: boatBlocking.startTime,
        end: boatBlocking.endTime,
      })
      .from(boatBlocking)
      .where(and(lt(boatBlocking.startTime, to), gt(boatBlocking.endTime, from))),
    db
      .select({
        id: boatExternalCalendarEvents.id,
        boatId: boatExternalCalendarEvents.boatId,
        summary: boatExternalCalendarEvents.summary,
        start: boatExternalCalendarEvents.startTime,
        end: boatExternalCalendarEvents.endTime,
      })
      .from(boatExternalCalendarEvents)
      .where(and(lt(boatExternalCalendarEvents.startTime, to), gt(boatExternalCalendarEvents.endTime, from))),
  ]);

  const byBoat = new Map<string, TimelineBoat>(
    boatRows.map((b) => [b.id, { id: b.id, name: b.name, timezone: b.timezone, segments: [] }])
  );
  const add = (boatId: string | null, seg: TimelineBoat["segments"][number]) => {
    if (boatId) byBoat.get(boatId)?.segments.push(seg);
  };
  for (const t of trips) {
    if (!t.start || !t.end) continue;
    const kind: TimelineKind = t.status === "BOOKED" ? "booked" : "proposed";
    add(t.boatId, { id: t.id, kind, label: t.customerName, start: t.start, end: t.end, href: `/admin/bookings/${t.id}` });
  }
  for (const b of blocks) {
    add(b.boatId, { id: b.id, kind: "block", label: b.reason || String(b.type), start: b.start, end: b.end, href: null });
  }
  for (const e of events) {
    add(e.boatId, { id: e.id, kind: "external", label: e.summary || "Imported event", start: e.start, end: e.end, href: null });
  }
  return [...byBoat.values()];
});
