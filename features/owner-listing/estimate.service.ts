import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/database/db";
import { boatPricingTiers, boats } from "@/database/schema";
import { estimateGroupFor, type ComparableBoat } from "./estimate";

/**
 * Live boats' 4/6/8-hour guest prices for the earnings estimate.
 * Only what the public boat pages already show (type, length, prices).
 */
export async function getComparableBoats(): Promise<ComparableBoat[]> {
  const rows = await db
    .select({
      category: boats.category,
      lengthFt: boats.lengthFt,
      p4: sql<number>`max(${boatPricingTiers.price}) filter (where ${boatPricingTiers.hours} = 4)`,
      p6: sql<number>`max(${boatPricingTiers.price}) filter (where ${boatPricingTiers.hours} = 6)`,
      p8: sql<number>`max(${boatPricingTiers.price}) filter (where ${boatPricingTiers.hours} = 8)`,
    })
    .from(boats)
    .innerJoin(boatPricingTiers, eq(boatPricingTiers.boatId, boats.id))
    .where(
      and(
        eq(boats.active, true),
        eq(boatPricingTiers.isActive, true),
        inArray(boatPricingTiers.hours, [4, 6, 8]),
        sql`${boats.lengthFt} between 12 and 250`
      )
    )
    .groupBy(boats.id, boats.category, boats.lengthFt);

  return rows.map((r) => [
    estimateGroupFor(r.category),
    r.lengthFt,
    Math.round(Number(r.p4) || 0),
    Math.round(Number(r.p6) || 0),
    Math.round(Number(r.p8) || 0),
  ]);
}
