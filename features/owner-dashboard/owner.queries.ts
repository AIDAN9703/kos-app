import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/database/db";
import {
  boatPricingTiers,
  boats,
  bookingExpenseLines,
  bookingOps,
  bookings,
  ownerProfiles,
  users,
} from "@/database/schema";
import {
  OWNER_VISIBLE_STATUSES,
  type OwnerBoat,
  type OwnerBoatDetail,
  type OwnerCharter,
  type OwnerIdentity,
} from "./owner.types";

/**
 * Read-only queries for the owner dashboard. Every function takes the
 * signed-in owner's id (from the session, never the URL) and filters on
 * boats.owner_id, so an owner can only ever see their own fleet.
 */

export async function getOwnerIdentity(ownerId: string): Promise<OwnerIdentity> {
  const [row] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      businessName: ownerProfiles.businessName,
    })
    .from(users)
    .leftJoin(ownerProfiles, eq(ownerProfiles.userId, users.id))
    .where(eq(users.id, ownerId))
    .limit(1);
  return {
    name: [row?.firstName, row?.lastName].filter(Boolean).join(" ") || row?.username || "Owner",
    businessName: row?.businessName ?? null,
  };
}

const boatColumns = {
  id: boats.id,
  name: boats.name,
  displayTitle: boats.displayTitle,
  category: boats.category,
  active: boats.active,
  mainImage: boats.mainImage,
  locationLabel: boats.locationLabel,
  timezone: boats.timezone,
  capacity: boats.capacity,
  lengthFt: boats.lengthFt,
  make: boats.make,
  model: boats.model,
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

export async function getOwnerBoats(ownerId: string): Promise<OwnerBoat[]> {
  const rows = await db
    .select(boatColumns)
    .from(boats)
    .where(eq(boats.ownerId, ownerId))
    .orderBy(desc(boats.active), asc(boats.name));
  return rows.map(toOwnerBoat);
}

export async function getOwnerBoat(
  ownerId: string,
  boatId: string
): Promise<OwnerBoatDetail | null> {
  const [row] = await db
    .select({ ...boatColumns, description: boats.description })
    .from(boats)
    .where(and(eq(boats.id, boatId), eq(boats.ownerId, ownerId)))
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

/** Dated charters on the owner's boats, optionally for one boat. */
export async function getOwnerCharters(ownerId: string, boatId?: string): Promise<OwnerCharter[]> {
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
        eq(boats.ownerId, ownerId),
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
