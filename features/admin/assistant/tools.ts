import { tool } from "ai";
import { z } from "zod";
import { differenceInHours, format } from "date-fns";

import { getDealWithParty, listDeals } from "@/features/bookings/deal.data";
import {
  getFleetLeaders,
  getRevenueTrend,
  getUnassignedLeads,
  getUpcomingTrips,
} from "@/features/admin/dashboard.data";
import type { BookingListItem } from "@/features/bookings/booking.types";
import { isTripUrgent, readinessGaps } from "@/features/bookings/lib/trip-readiness";
import { effectiveTotalCents } from "@/features/bookings/lib/booking-money";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";

/**
 * The assistant's toolbox = the admin's own service layer, thinly wrapped.
 * Every tool runs the same admin-gated queries the board and dashboard use;
 * the model never touches the database directly and never writes SQL.
 * Outputs are pre-formatted (money as dollars, times boat-local) so the
 * model reports numbers instead of computing them.
 */

const money = (cents: number | null | undefined) =>
  cents == null ? null : formatCentsAsWholeDollars(cents);

const when = (d: Date | string | null | undefined, tz: string | null | undefined) =>
  d ? formatBoatLocal(d, tz, "EEE MMM d, yyyy · h:mm a zzz") : null;

function rowSummary(b: BookingListItem) {
  const admin = [b.assignedAdminFirstName, b.assignedAdminLastName].filter(Boolean).join(" ");
  return {
    id: b.id,
    link: `/admin/bookings/${b.id}`,
    customer: b.customerName,
    email: b.customerEmail,
    phone: b.customerPhone,
    boat: b.boatName,
    type: b.bookingType,
    status: b.bookingStatus,
    source: b.source,
    tripStart: when(b.startDateTime, b.boatTimezone),
    tripEnd: when(b.endDateTime, b.boatTimezone),
    guests: b.numberOfPassengers,
    total: money(effectiveTotalCents(b)),
    cardFeeWaived: b.serviceFeeWaived || undefined,
    paid: money(b.totalPaidCents),
    balanceDue: money(Math.max(0, effectiveTotalCents(b) - (b.totalPaidCents ?? 0))),
    paymentStatus: b.paymentDisplayStatus,
    gmv: money(b.opsGmvCents ?? null),
    revenue: money(b.opsRevenueCents ?? null),
    assignedAdmin: admin || null,
    party: b.bookingGroupName ?? null,
    readinessGaps: b.startDateTime ? readinessGaps(b).map((g) => g.label.toLowerCase()) : [],
    createdAt: format(new Date(b.createdAt), "MMM d, yyyy"),
  };
}

export const assistantTools = {
  search_bookings: tool({
    description:
      "Search deals/bookings. Use for questions about specific customers, boats, statuses, or time windows. Returns up to `limit` rows, newest first.",
    inputSchema: z.object({
      query: z.string().optional().describe("Free text: customer name, email, phone, or boat name"),
      status: z
        .enum(["INQUIRY", "PROPOSED", "BOOKED", "COMPLETED", "CANCELLED"])
        .optional()
        .describe("INQUIRY=lead, PROPOSED=priced proposal, BOOKED=trip is theirs (paymentStatus says what is paid), COMPLETED, CANCELLED"),
      kind: z
        .enum(["INQUIRY", "BOOKING", "INSTANT_BOOK", "TERM_CHARTER", "MARKETPLACE"])
        .optional()
        .describe("INQUIRY = unpriced leads; BOOKING = priced deals; others are distinct products"),
      time: z.enum(["upcoming", "past"]).optional().describe("Trip date relative to now"),
      limit: z.number().int().min(1).max(50).default(15),
    }),
    execute: async ({ query, status, kind, time, limit }) => {
      const now = new Date();
      const result = await listDeals({
        search: query,
        bookingStatus: status,
        bookingType: kind,
        dateFrom: time === "upcoming" ? now.toISOString() : undefined,
        dateTo: time === "past" ? now.toISOString() : undefined,
        limit,
        page: 1,
      });
      return { totalMatching: result.totalCount, rows: result.bookings.map(rowSummary) };
    },
  }),

  get_booking: tool({
    description:
      "Full detail for one booking by id: trip, customer, money, payments, captain/crew, and every other boat in its charter party.",
    inputSchema: z.object({ bookingId: z.string().uuid() }),
    execute: async ({ bookingId }) => {
      const deal = await getDealWithParty(bookingId);
      if (!deal) return { error: "No booking with that id" };
      const { booking, party } = deal;
      return {
        id: booking.id,
        link: `/admin/bookings/${booking.id}`,
        customer: {
          name: booking.customerName,
          email: booking.customerEmail,
          phone: booking.customerPhone,
        },
        status: booking.bookingStatus,
        type: booking.bookingType,
        source: booking.source,
        boat: booking.boatName,
        tripStart: when(booking.startDateTime, booking.boatTimezone),
        tripEnd: when(booking.endDateTime, booking.boatTimezone),
        guests: booking.numberOfPassengers,
        needsCaptain: booking.needsCaptain,
        captain: [booking.captainFirstName, booking.captainLastName].filter(Boolean).join(" ") || null,
        pickup: booking.pickupLocation,
        dropoff: booking.dropoffLocation,
        total: money(effectiveTotalCents(booking)),
        cardFeeWaived: booking.serviceFeeWaived || undefined,
        paid: money(booking.totalPaidCents),
        balanceDue: money(Math.max(0, effectiveTotalCents(booking) - (booking.totalPaidCents ?? 0))),
        paymentStatus: booking.paymentDisplayStatus,
        customerMessage: booking.customerMessage,
        charterParty:
          party && party.length > 1
            ? party.map((m) => ({
                bookingId: m.booking.id,
                boat: m.boat?.name ?? null,
                status: m.booking.bookingStatus,
                total: money(m.pricing ? Number(m.pricing.totalAmountCents) : null),
              }))
            : null,
      };
    },
  }),

  revenue_summary: tool({
    description:
      "Monthly charter volume (GMV), KOS revenue (GMV minus expenses), and trip counts for the trailing N months (current month last). Use for any 'how did we do' / revenue / money-over-time question.",
    inputSchema: z.object({ months: z.number().int().min(1).max(24).default(6) }),
    execute: async ({ months }) => {
      const trend = await getRevenueTrend(months);
      const totals = trend.reduce(
        (a, m) => ({
          gmvCents: a.gmvCents + m.gmvCents,
          revenueCents: a.revenueCents + m.revenueCents,
          trips: a.trips + m.trips,
        }),
        { gmvCents: 0, revenueCents: 0, trips: 0 }
      );
      return {
        months: trend.map((m) => ({
          month: m.monthName,
          gmv: money(m.gmvCents),
          revenue: money(m.revenueCents),
          trips: m.trips,
        })),
        totals: {
          gmv: money(totals.gmvCents),
          revenue: money(totals.revenueCents),
          trips: totals.trips,
        },
        note: "GMV excludes the card-processing fee. Revenue is GMV minus each booking's expense lines.",
      };
    },
  }),

  upcoming_departures: tool({
    description:
      "Real trips leaving in the next N days with readiness (captain, balance) — the operational 'what's sailing' view. Times are boat-local.",
    inputSchema: z.object({ days: z.number().int().min(1).max(90).default(7) }),
    execute: async ({ days }) => {
      const trips = await getUpcomingTrips(days);
      const now = new Date();
      return {
        count: trips.length,
        trips: trips.map((t) => ({
          ...rowSummary(t),
          hoursUntilStart: t.startDateTime
            ? differenceInHours(new Date(t.startDateTime), now)
            : null,
          urgent: isTripUrgent(t, now),
        })),
      };
    },
  }),

  action_queue: tool({
    description:
      "What needs a human right now: unclaimed new leads and booked trips that still owe money.",
    inputSchema: z.object({}),
    execute: async () => {
      const [leads, trips] = await Promise.all([getUnassignedLeads(10), getUpcomingTrips(30)]);
      const collect = trips.filter(
        (t) =>
          t.bookingStatus === "BOOKED" &&
          effectiveTotalCents(t) > 0 &&
          (t.totalPaidCents ?? 0) < effectiveTotalCents(t)
      );
      return {
        unclaimedLeads: leads.map((l) => ({
          id: l.id,
          link: `/admin/bookings/${l.id}`,
          customer: l.name,
          source: l.source,
          estimatedValue: money(l.estimatedValueCents ?? l.budgetCents),
          receivedAt: format(new Date(l.createdAt), "MMM d, h:mm a"),
        })),
        balancesToCollect: collect.map(rowSummary),
      };
    },
  }),

  fleet_leaders: tool({
    description: "This month's top boats by GMV — which hulls are earning.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(5) }),
    execute: async ({ limit }) => {
      const leaders = await getFleetLeaders(limit);
      return leaders.map((l, i) => ({
        rank: i + 1,
        boat: l.name,
        gmv: money(l.gmvCents),
        charters: l.trips,
        link: `/admin/boats/${l.boatId}`,
      }));
    },
  }),
};
