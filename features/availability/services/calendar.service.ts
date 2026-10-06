import "server-only";

import { and, eq, gt, gte, inArray, lt, lte, or } from "drizzle-orm";

import { db } from "@/database/db";
import { bookingPricing, bookings, boatExternalCalendarEvents, boats } from "@/database/schema";

/**
 * Calendar reads: booked trips and imported busy blocks for the admin
 * calendar, and booked trips for the subscribable iCal feeds. Server-only and
 * not access-checked: availability.data.ts checks the viewer (or the feed's
 * signed token) first.
 */

/** Booked trips and imported (iCal) blocks overlapping a window, optionally for one boat. */
export async function getCalendarEvents(start: Date, end: Date, boatId?: string) {
  // Overlap, not starts-within: a multi-day charter that began before the
  // visible window must still render inside it.
  const [booked, external] = await Promise.all([
    db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        start: bookings.startDateTime,
        end: bookings.endDateTime,
        status: bookings.bookingStatus,
        boatId: bookings.boatId,
        boatName: boats.name,
        numberOfPassengers: bookings.numberOfPassengers,
        totalAmountCents: bookingPricing.totalAmountCents,
      })
      .from(bookings)
      .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .where(
        and(
          lt(bookings.startDateTime, end),
          gt(bookings.endDateTime, start),
          inArray(bookings.bookingStatus, ["BOOKED"]),
          boatId ? eq(bookings.boatId, boatId) : undefined
        )
      ),
    db
      .select({
        id: boatExternalCalendarEvents.id,
        summary: boatExternalCalendarEvents.summary,
        start: boatExternalCalendarEvents.startTime,
        end: boatExternalCalendarEvents.endTime,
        boatId: boatExternalCalendarEvents.boatId,
      })
      .from(boatExternalCalendarEvents)
      .where(
        and(
          lt(boatExternalCalendarEvents.startTime, end),
          gt(boatExternalCalendarEvents.endTime, start),
          boatId ? eq(boatExternalCalendarEvents.boatId, boatId) : undefined
        )
      ),
  ]);
  return { booked, external };
}

/**
 * Booked trips for an iCal feed, by boat, captain, or boat owner. The owner
 * match also checks boats.owner_id (older bookings may lack boat_owner_id).
 */
export async function getFeedBookings(filter: {
  start: Date;
  end: Date;
  boatId?: string;
  captainId?: string;
  ownerId?: string;
}) {
  return db
    .select({
      id: bookings.id,
      customerName: bookings.customerName,
      customerEmail: bookings.customerEmail,
      customerPhone: bookings.customerPhone,
      startDateTime: bookings.startDateTime,
      endDateTime: bookings.endDateTime,
      numberOfPassengers: bookings.numberOfPassengers,
      pickupLocation: bookings.pickupLocation,
      boatName: boats.name,
    })
    .from(bookings)
    .leftJoin(boats, eq(bookings.boatId, boats.id))
    .where(
      and(
        gte(bookings.startDateTime, filter.start),
        lte(bookings.startDateTime, filter.end),
        inArray(bookings.bookingStatus, ["BOOKED"]),
        filter.boatId ? eq(bookings.boatId, filter.boatId) : undefined,
        filter.captainId ? eq(bookings.captainUserId, filter.captainId) : undefined,
        filter.ownerId
          ? or(eq(bookings.boatOwnerId, filter.ownerId), eq(boats.ownerId, filter.ownerId))
          : undefined
      )
    );
}
