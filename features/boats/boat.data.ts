import "server-only";

import { cache } from "react";

import { boatService } from "@/features/boats/boat.service";
import {
  createBoatSchema,
  updateBoatSchema,
  type BoatFilterInput,
  type CreateBoatInput,
  type UpdateBoatInput,
} from "@/features/boats/boat.validation";
import type {
  BoatCard,
  BoatDetail,
  BoatForAdminSelect,
  BoatTier,
  PaginatedBoatsResponse,
  PublicBoat,
} from "@/features/boats/boat.types";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { cachedFetch, isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Boats data layer: the only way pages, API routes and server actions read or
 * change boats. Each function checks who's asking and returns the narrowest
 * shape for them (boat.types.ts):
 *
 * - Public: active boats only, public columns, active tiers without payouts.
 * - Staff pickers (boat:view, admins and brokers): picker fields and tiers.
 * - Fleet management (boat:edit / boat:delete, admins): everything.
 */

/** Cache tag on the public boat listings; every boat write refreshes it. */
export const PUBLIC_BOATS_TAG = "public-boats";

// ========================================
// PUBLIC
// ========================================

/** An active boat for its listing page and the booking flow, or null. */
export const getPublicBoat = cache(async (id: string): Promise<PublicBoat | null> => {
  if (!isUuid(id)) return null;
  const [boat, pricingTiers, boatAddOns] = await Promise.all([
    boatService.getActiveBoat(id),
    boatService.getActiveTiers([id]),
    boatService.getOfferedAddOns(id),
  ]);
  return boat ? { ...boat, pricingTiers, boatAddOns } : null;
});

/** The home page's featured fleet. */
export function getFeaturedBoats(): Promise<BoatCard[]> {
  return cachedFetch("featured-boats", () => boatService.getFeaturedCards(), {
    tags: [PUBLIC_BOATS_TAG],
  });
}

/** Boats offered for term charters (the term charters page). */
export function getTermCharterBoats(): Promise<BoatCard[]> {
  return cachedFetch("term-charter-boats", () => boatService.getTermCharterCards(9), {
    tags: [PUBLIC_BOATS_TAG],
  });
}

/** Ids of listed boats, for the sitemap and pre-rendering. */
export function getPublicBoatIds(options?: { featuredOnly?: boolean }): Promise<string[]> {
  return boatService.getActiveBoatIds(options);
}

// ========================================
// STAFF PICKERS (boat:view)
// ========================================

export async function getBoatsForPicker(search?: string): Promise<BoatForAdminSelect[]> {
  await assertCan({ boat: ["view"] });
  return boatService.getBoatsForAdminSelect(search);
}

export async function getBoatForPicker(id: string): Promise<BoatForAdminSelect | null> {
  await assertCan({ boat: ["view"] });
  return isUuid(id) ? boatService.getBoatForAdminSelect(id) : null;
}

/** Active tiers to price a trip: one boat's, or every boat's when none is given. */
export async function getBoatTiers(boatId?: string): Promise<BoatTier[]> {
  await assertCan({ boat: ["view"] });
  if (boatId !== undefined && !isUuid(boatId)) return [];
  return boatService.getActiveTiers(boatId ? [boatId] : undefined);
}

// ========================================
// FLEET MANAGEMENT (boat:edit, boat:delete)
// ========================================

export async function listBoats(filters?: BoatFilterInput): Promise<PaginatedBoatsResponse> {
  await assertCan({ boat: ["edit"] });
  return boatService.getAllBoats(filters);
}

/** Everything about a boat, active or not. */
export async function getBoatDetail(id: string): Promise<BoatDetail | null> {
  await assertCan({ boat: ["edit"] });
  return isUuid(id) ? boatService.getBoatDetail(id) : null;
}

export async function createBoat(input: CreateBoatInput): Promise<{ id: string }> {
  await assertCan({ boat: ["edit"] });
  return boatService.createBoat(createBoatSchema.parse(input));
}

export async function updateBoat(id: string, input: UpdateBoatInput): Promise<void> {
  await assertCan({ boat: ["edit"] });
  await boatService.updateBoat(id, updateBoatSchema.parse(input));
}

export async function deleteBoat(id: string): Promise<void> {
  await assertCan({ boat: ["delete"] });
  await boatService.deleteBoat(id);
}
