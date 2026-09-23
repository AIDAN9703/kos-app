import "server-only";

import { and, asc, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/database/db";
import {
  boats,
  bookingCrew,
  bookingPricing,
  bookings,
  captainProfiles,
  payments,
  users,
} from "@/database/schema";
import { effectiveTotalCents } from "@/features/bookings/lib/booking-money";
import type {
  AccountUser,
  CaptainAssignment,
  CaptainSummary,
  OwnedBoat,
  OwnerCharter,
  TripDetail,
  TripSummary,
} from "./profile.types";

/**
 * Server-side reads for the profile section. Every function is scoped to the
 * signed-in user's id — callers pass `session.user.id`, never an id from the
 * URL — so a customer can only ever see their own rows.
 */

// ── Account ────────────────────────────────────────────────────────────────

export async function getAccount(userId: string): Promise<AccountUser | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return null;
  // The bcrypt hash must never reach a component, even one that ignores it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to drop it
  const { password, ...account } = row;
  return account;
}

// ── Trips (the customer's own bookings) ────────────────────────────────────

/** Money in per booking — same rule the admin board uses: succeeded, refunds excluded. */
const paidByBooking = db
  .select({
    bookingId: payments.payableId,
    paidCents: sql<string>`coalesce(sum(${payments.amountCents}), 0)`.as("paid_cents"),
  })
  .from(payments)
  .where(
    and(
      eq(payments.payableType, "BOOKING"),
      eq(payments.status, "SUCCEEDED"),
      ne(payments.paymentType, "REFUND")
    )
  )
  .groupBy(payments.payableId)
  .as("paid");

const tripColumns = {
  id: bookings.id,
  status: bookings.bookingStatus,
  boatId: bookings.boatId,
  boatName: boats.name,
  boatDisplayTitle: boats.displayTitle,
  boatCategory: boats.category,
  boatImage: boats.mainImage,
  timezone: boats.timezone,
  startsAt: bookings.startDateTime,
  endsAt: bookings.endDateTime,
  guests: bookings.numberOfPassengers,
  pickupLocation: bookings.pickupLocation,
  needsCaptain: bookings.needsCaptain,
  publicToken: bookings.publicToken,
  createdAt: bookings.createdAt,
  totalAmountCents: bookingPricing.totalAmountCents,
  serviceFeeCents: bookingPricing.serviceFeeCents,
  serviceFeeWaived: bookingPricing.serviceFeeWaived,
  depositAmountCents: bookingPricing.depositAmountCents,
  paidCents: paidByBooking.paidCents,
};

function tripQuery() {
  return db
    .select(tripColumns)
    .from(bookings)
    .leftJoin(bookingPricing, eq(bookingPricing.bookingId, bookings.id))
    .leftJoin(boats, eq(boats.id, bookings.boatId))
    .leftJoin(paidByBooking, eq(paidByBooking.bookingId, bookings.id));
}

type TripRow = Awaited<ReturnType<typeof tripQuery>>[number];

function toTripSummary(row: TripRow): TripSummary {
  const totalCents = effectiveTotalCents({
    totalAmountCents: row.totalAmountCents,
    serviceFeeCents: row.serviceFeeCents,
    serviceFeeWaived: row.serviceFeeWaived,
  });
  const paidCents = Number(row.paidCents ?? 0);
  const deposit = Number(row.depositAmountCents ?? 0);
  return {
    id: row.id,
    status: row.status,
    boatId: row.boatId,
    boatName: row.boatDisplayTitle || row.boatName || "Charter",
    boatCategory: row.boatCategory,
    boatImage: row.boatImage,
    timezone: row.timezone,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    guests: row.guests,
    pickupLocation: row.pickupLocation,
    needsCaptain: row.needsCaptain ?? false,
    totalCents,
    paidCents,
    balanceCents: Math.max(0, totalCents - paidCents),
    depositCents: deposit > 0 ? deposit : null,
    publicToken: row.publicToken,
    createdAt: row.createdAt,
  };
}

/** Every booking the user owns, unsorted — callers order with splitTrips(). */
export async function getTrips(userId: string): Promise<TripSummary[]> {
  const rows = await tripQuery().where(eq(bookings.userId, userId));
  return rows.map(toTripSummary);
}

export async function getTrip(userId: string, bookingId: string): Promise<TripDetail | null> {
  const [row] = await db
    .select({
      ...tripColumns,
      dropoffLocation: bookings.dropoffLocation,
      specialRequests: bookings.specialRequests,
      occasionType: bookings.occasionType,
      acceptedAt: bookings.acceptedAt,
      cancelledAt: bookings.cancelledAt,
      cancellationReason: bookings.cancellationReason,
      currency: bookingPricing.currency,
      paymentType: bookings.paymentType,
    })
    .from(bookings)
    .leftJoin(bookingPricing, eq(bookingPricing.bookingId, bookings.id))
    .leftJoin(boats, eq(boats.id, bookings.boatId))
    .leftJoin(paidByBooking, eq(paidByBooking.bookingId, bookings.id))
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
    .limit(1);

  if (!row) return null;
  return {
    ...toTripSummary(row),
    dropoffLocation: row.dropoffLocation,
    specialRequests: row.specialRequests,
    occasionType: row.occasionType,
    acceptedAt: row.acceptedAt,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    currency: row.currency ?? "USD",
    paymentType:
      row.paymentType === "DEPOSIT_ONLY" || row.paymentType === "FULL_PAYMENT" ? row.paymentType : null,
  };
}

/** Cheap count for the identity card in the layout. */
export async function countCompletedTrips(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.bookingStatus, "COMPLETED")));
  return Number(row?.count ?? 0);
}

// ── Owner ──────────────────────────────────────────────────────────────────

export async function getOwnedBoats(userId: string): Promise<OwnedBoat[]> {
  return db
    .select({
      id: boats.id,
      name: boats.name,
      displayTitle: boats.displayTitle,
      category: boats.category,
      active: boats.active,
      mainImage: boats.mainImage,
      locationLabel: boats.locationLabel,
      capacity: boats.capacity,
    })
    .from(boats)
    .where(eq(boats.ownerId, userId))
    .orderBy(desc(boats.active), asc(boats.name));
}

/** Booked charters ahead on the owner's boats. Deliberately no customer fields. */
export async function getUpcomingOwnerCharters(userId: string): Promise<OwnerCharter[]> {
  return db
    .select({
      id: bookings.id,
      boatName: boats.name,
      startsAt: bookings.startDateTime,
      endsAt: bookings.endDateTime,
      timezone: boats.timezone,
      guests: bookings.numberOfPassengers,
    })
    .from(bookings)
    .innerJoin(boats, eq(boats.id, bookings.boatId))
    .where(
      and(
        eq(boats.ownerId, userId),
        eq(bookings.bookingStatus, "BOOKED"),
        gte(bookings.startDateTime, new Date())
      )
    )
    .orderBy(asc(bookings.startDateTime))
    .limit(10);
}

// ── Captain ────────────────────────────────────────────────────────────────

export async function getCaptainSummary(userId: string): Promise<CaptainSummary | null> {
  const [profile] = await db
    .select({
      status: captainProfiles.status,
      uscgLicensed: captainProfiles.uscgLicensed,
      licenseType: captainProfiles.licenseType,
      licenseExpiry: captainProfiles.licenseExpiry,
      totalTripsCompleted: captainProfiles.totalTripsCompleted,
      yearsExperience: captainProfiles.yearsExperience,
    })
    .from(captainProfiles)
    .where(eq(captainProfiles.userId, userId))
    .limit(1);
  if (!profile) return null;

  // Assigned either as the primary captain or as a crew member.
  const crewBookingIds = db
    .select({ id: bookingCrew.bookingId })
    .from(bookingCrew)
    .where(eq(bookingCrew.userId, userId));
  const assignedTo = or(eq(bookings.captainUserId, userId), inArray(bookings.id, crewBookingIds));

  const [upcoming, [completed]] = await Promise.all([
    db
      .select({
        id: bookings.id,
        boatName: boats.name,
        boatImage: boats.mainImage,
        startsAt: bookings.startDateTime,
        endsAt: bookings.endDateTime,
        timezone: boats.timezone,
        guests: bookings.numberOfPassengers,
        pickupLocation: bookings.pickupLocation,
      })
      .from(bookings)
      .leftJoin(boats, eq(boats.id, bookings.boatId))
      .where(
        and(assignedTo, eq(bookings.bookingStatus, "BOOKED"), gte(bookings.startDateTime, new Date()))
      )
      .orderBy(asc(bookings.startDateTime))
      .limit(10),
    db
      .select({ count: sql<string>`count(*)` })
      .from(bookings)
      .where(and(assignedTo, eq(bookings.bookingStatus, "COMPLETED"))),
  ]);

  const assignments: CaptainAssignment[] = upcoming.map((row) => ({
    ...row,
    boatName: row.boatName ?? "Charter",
  }));

  return { profile, upcoming: assignments, completedCount: Number(completed?.count ?? 0) };
}
