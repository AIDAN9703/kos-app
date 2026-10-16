import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/database/db";
import {
  boatMakes,
  boatModels,
  boatPricingTiers,
  boats,
  bookingExpenseLines,
  bookingOps,
  bookings,
} from "@/database/schema";
import {
  OWNER_VISIBLE_STATUSES,
  type OwnerBoat,
  type OwnerBoatDetail,
  type OwnerCharter,
} from "./owner.types";

/**
 * Read-only queries for the owner portal, each filtered on one owner
 * account. Not access-checked: pages go through owner.data.ts, which passes
 * an account the signed-in person belongs to (never one from the URL).
 */

const boatColumns = {
  id: boats.id,
  name: boats.name,
  displayTitle: boats.displayTitle,
  category: boats.category,
  active: boats.active,
  managedBy: boats.managedBy,
  listingStatus: boats.listingStatus,
  reviewNote: boats.listingReviewNote,
  insuranceExpiry: boats.insuranceExpiry,
  photoCount: sql<number>`(${boats.mainImage} is not null)::int + coalesce(array_length(${boats.galleryImages}, 1), 0)`,
  fromPriceDollars: sql<
    number | null
  >`(select min(t.price) from boat_pricing_tier t where t.boat_id = ${boats.id} and t.is_active)`,
  mainImage: boats.mainImage,
  locationLabel: boats.locationLabel,
  timezone: boats.timezone,
  capacity: boats.capacity,
  lengthFt: boats.lengthFt,
  make: boatMakes.name,
  model: boatModels.name,
  yearBuilt: boats.yearBuilt,
};

/** Owners see the listing title when there is one, like guests do. */
function toOwnerBoat<T extends { name: string; displayTitle: string | null }>({
  displayTitle,
  name,
  ...rest
}: T) {
  return { ...rest, name: displayTitle || name };
}

export async function getOwnerBoats(accountId: string): Promise<OwnerBoat[]> {
  const rows = await db
    .select(boatColumns)
    .from(boats)
    .leftJoin(boatMakes, eq(boatMakes.id, boats.makeId))
    .leftJoin(boatModels, eq(boatModels.id, boats.modelId))
    .where(eq(boats.ownerAccountId, accountId))
    .orderBy(desc(boats.active), asc(boats.name));
  return rows.map(toOwnerBoat);
}

export async function getOwnerBoat(
  accountId: string,
  boatId: string
): Promise<OwnerBoatDetail | null> {
  const [row] = await db
    .select({ ...boatColumns, description: boats.description })
    .from(boats)
    .leftJoin(boatMakes, eq(boatMakes.id, boats.makeId))
    .leftJoin(boatModels, eq(boatModels.id, boats.modelId))
    .where(and(eq(boats.id, boatId), eq(boats.ownerAccountId, accountId)))
    .limit(1);
  if (!row) return null;

  const tiers = await db
    .select({
      id: boatPricingTiers.id,
      name: boatPricingTiers.name,
      hours: boatPricingTiers.hours,
      price: boatPricingTiers.price,
      ownerPayoutCents: boatPricingTiers.ownerPayoutCents,
    })
    .from(boatPricingTiers)
    .where(and(eq(boatPricingTiers.boatId, boatId), eq(boatPricingTiers.isActive, true)))
    .orderBy(asc(boatPricingTiers.hours));

  return {
    ...toOwnerBoat(row),
    tiers: tiers.map((t) => ({
      id: t.id,
      label: t.name || `${t.hours} hours`,
      hours: t.hours,
      guestPriceDollars: Number(t.price),
      ownerPayoutCents: t.ownerPayoutCents != null ? Number(t.ownerPayoutCents) : null,
    })),
  };
}

/** The team's recorded owner payout per booking (sum of OWNER_PAYOUT expense lines). */
const payoutByBooking = db
  .select({
    bookingId: bookingExpenseLines.bookingId,
    payoutCents: sql<string>`sum(${bookingExpenseLines.amountCents})`.as("payout_cents"),
  })
  .from(bookingExpenseLines)
  .where(eq(bookingExpenseLines.category, "OWNER_PAYOUT"))
  .groupBy(bookingExpenseLines.bookingId)
  .as("payout");

/**
 * Dated charters booked while the boat was this owner's (the booking keeps
 * its owner, so history stays put when a boat changes hands), optionally
 * for one boat.
 */
export async function getOwnerCharters(
  accountId: string,
  boatId?: string
): Promise<OwnerCharter[]> {
  const rows = await db
    .select({
      id: bookings.id,
      boatId: boats.id,
      boatName: boats.name,
      boatDisplayTitle: boats.displayTitle,
      timezone: boats.timezone,
      status: bookings.bookingStatus,
      startsAt: bookings.startDateTime,
      endsAt: bookings.endDateTime,
      guests: bookings.numberOfPassengers,
      needsCaptain: bookings.needsCaptain,
      pickupLocation: bookings.pickupLocation,
      payoutCents: payoutByBooking.payoutCents,
      paidOutCents: bookingOps.sentToOwnerCents,
    })
    .from(bookings)
    .innerJoin(boats, eq(boats.id, bookings.boatId))
    .leftJoin(payoutByBooking, eq(payoutByBooking.bookingId, bookings.id))
    .leftJoin(bookingOps, eq(bookingOps.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.ownerAccountId, accountId),
        boatId ? eq(boats.id, boatId) : undefined,
        inArray(bookings.bookingStatus, [...OWNER_VISIBLE_STATUSES]),
        sql`${bookings.startDateTime} is not null`
      )
    )
    .orderBy(asc(bookings.startDateTime));

  return rows.map((row) => ({
    id: row.id,
    boatId: row.boatId,
    boatName: row.boatDisplayTitle || row.boatName,
    timezone: row.timezone,
    status: row.status as OwnerCharter["status"],
    // Filtered to non-null above; the column type just doesn't know it.
    startsAt: row.startsAt as Date,
    endsAt: row.endsAt,
    guests: row.guests,
    needsCaptain: row.needsCaptain ?? false,
    pickupLocation: row.pickupLocation,
    payoutCents: row.payoutCents != null ? Number(row.payoutCents) : null,
    paidOutCents: Number(row.paidOutCents ?? 0),
  }));
}
