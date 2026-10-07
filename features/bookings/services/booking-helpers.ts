import "server-only";

/**
 * Shared helpers for booking operations
 * Centralizes boat + tier fetching to avoid duplication
 */

import { db } from "@/database/db";
import { boats, boatPricingTiers } from "@/database/schema";
import { and, eq, inArray } from "drizzle-orm";

type BoatForBooking = {
  id: string;
  ownerId: string;
  cleaningFee: number | null;
  depositAmount: number | null;
  crewRequired: boolean;
  currency: string;
};

type TierForBooking = {
  id: string;
  price: number;
  hours: number;
};

/**
 * Fetch boat and pricing tier by IDs - used across createBookingRequest,
 * createInstantBooking, webhooks
 */
export async function fetchBoatAndTier(
  boatId: string,
  pricingTierId: string | null
): Promise<{
  boat: BoatForBooking;
  tier: TierForBooking | null;
}> {
  const [boat] = await db
    .select({
      id: boats.id,
      ownerId: boats.ownerId,
      cleaningFee: boats.cleaningFee,
      depositAmount: boats.depositAmount,
      crewRequired: boats.crewRequired,
      currency: boats.currency,
    })
    .from(boats)
    .where(eq(boats.id, boatId))
    .limit(1);

  if (!boat) throw new Error(`Boat not found: ${boatId}`);

  let tier: TierForBooking | null = null;
  if (pricingTierId) {
    const [tierRow] = await db
      .select({
        id: boatPricingTiers.id,
        price: boatPricingTiers.price,
        hours: boatPricingTiers.hours,
      })
      .from(boatPricingTiers)
      .where(and(eq(boatPricingTiers.id, pricingTierId), eq(boatPricingTiers.boatId, boatId)))
      .limit(1);
    if (tierRow) tier = tierRow;
    else throw new Error(`Pricing tier not found: ${pricingTierId}`);
  }

  return {
    boat: {
      id: boat.id,
      ownerId: boat.ownerId,
      cleaningFee: boat.cleaningFee,
      depositAmount: boat.depositAmount,
      crewRequired: boat.crewRequired ?? false,
      currency: boat.currency ?? "USD",
    },
    tier,
  };
}

type BoatForBulkBooking = {
  id: string;
  name: string;
  mainImage: string | null;
  ownerId: string;
  cleaningFee: number | null;
  depositAmount: number | null;
  crewRequired: boolean;
  currency: string;
};

type TierForBulkBooking = {
  id: string;
  boatId: string;
  hours: number;
  price: number;
};

/**
 * Fetch multiple boats and tiers by IDs - used by createBookings
 */
export async function fetchBoatsAndTiersBulk(
  boatIds: string[],
  tierIds: string[]
): Promise<{
  boatsById: Map<string, BoatForBulkBooking>;
  tiersById: Map<string, TierForBulkBooking>;
}> {
  const [boatsRows, tiersRows] = await Promise.all([
    boatIds.length > 0
      ? db
          .select({
            id: boats.id,
            name: boats.name,
            mainImage: boats.mainImage,
            ownerId: boats.ownerId,
            cleaningFee: boats.cleaningFee,
            depositAmount: boats.depositAmount,
            crewRequired: boats.crewRequired,
            currency: boats.currency,
          })
          .from(boats)
          .where(inArray(boats.id, boatIds))
      : Promise.resolve([]),
    tierIds.length > 0
      ? db
          .select({
            id: boatPricingTiers.id,
            boatId: boatPricingTiers.boatId,
            hours: boatPricingTiers.hours,
            price: boatPricingTiers.price,
          })
          .from(boatPricingTiers)
          .where(inArray(boatPricingTiers.id, tierIds))
      : Promise.resolve([]),
  ]);

  const boatsById = new Map(
    boatsRows.map((b) => [
      b.id,
      {
        id: b.id,
        name: b.name,
        mainImage: b.mainImage,
        ownerId: b.ownerId,
        cleaningFee: b.cleaningFee,
        depositAmount: b.depositAmount,
        crewRequired: b.crewRequired ?? false,
        currency: b.currency ?? "USD",
      },
    ])
  );

  const tiersById = new Map(
    tiersRows.map((t) => [t.id, { id: t.id, boatId: t.boatId, hours: t.hours, price: t.price }])
  );

  return { boatsById, tiersById };
}
