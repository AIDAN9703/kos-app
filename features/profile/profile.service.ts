import "server-only";

import { and, asc, eq, gte, inArray, or, sql } from "drizzle-orm";
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
import { depositCharge } from "@/features/bookings/lib/charge-plan";
import { serviceFeeFromSnapshot } from "@/shared/lib/utils/pricing-utils";
import type {
  AccountUser,
  CaptainAssignment,
  CaptainSummary,
  TripDetail,
  TripSummary,
} from "./profile.types";

/**
 * Queries for the profile section, each scoped to one user's id. Not
 * access-checked: pages and actions go through profile.data.ts, which passes
 * the signed-in person's own id (never one from the URL).
 */

// ── Account ────────────────────────────────────────────────────────────────

const accountColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  emailVerified: users.emailVerified,
  phoneNumber: users.phoneNumber,
  phoneVerified: users.phoneVerified,
  profileImage: users.profileImage,
  username: users.username,
  bio: users.bio,
  address: users.address,
  city: users.city,
  state: users.state,
  postalCode: users.postalCode,
  country: users.country,
  emailNotifications: users.emailNotifications,
  smsNotifications: users.smsNotifications,
  marketingEmailsEnabled: users.marketingEmailsEnabled,
  createdAt: users.createdAt,
} satisfies { [K in keyof AccountUser]: unknown };

export async function getAccount(userId: string): Promise<AccountUser | null> {
  const [row] = await db.select(accountColumns).from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

/** Write the person's own editable columns (the data layer decides which). */
export async function updateAccount(
  userId: string,
  patch: Partial<typeof users.$inferInsert>
): Promise<void> {
  await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ── Trips (the customer's own bookings) ────────────────────────────────────

/** Money kept per booking — same rule the admin board uses: succeeded payments minus succeeded refunds. */
const paidByBooking = db
  .select({
    bookingId: payments.payableId,
    paidCents: sql<string>`greatest(coalesce(sum(case when ${payments.paymentType} = 'REFUND' then -${payments.amountCents} else ${payments.amountCents} end), 0), 0)`.as("paid_cents"),
  })
  .from(payments)
  .where(and(eq(payments.payableType, "BOOKING"), eq(payments.status, "SUCCEEDED")))
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
  serviceFeeBps: bookingPricing.serviceFeeBps,
  serviceFeeFixedCents: bookingPricing.serviceFeeFixedCents,
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
  const deposit = depositCharge({
    bookingId: row.id,
    totalCents: Number(row.totalAmountCents ?? 0),
    serviceFeeCents: Number(row.serviceFeeCents ?? 0),
    serviceFee: serviceFeeFromSnapshot(row),
    serviceFeeWaived: Boolean(row.serviceFeeWaived),
    depositCents: row.depositAmountCents != null ? Number(row.depositAmountCents) : null,
    paidCents,
  });
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
    depositChargeCents: deposit?.amountCents ?? null,
    offCard: Boolean(row.serviceFeeWaived),
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
      cancelledAt: bookings.cancelledAt,
      cancellationReason: bookings.cancellationReason,
      currency: bookingPricing.currency,
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
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    currency: row.currency ?? "USD",
  };
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
        and(
          assignedTo,
          eq(bookings.bookingStatus, "BOOKED"),
          gte(bookings.startDateTime, new Date())
        )
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
