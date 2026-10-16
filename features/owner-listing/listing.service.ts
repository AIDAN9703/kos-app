import "server-only";

import { and, asc, desc, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/database/db";
import {
  boatMakes,
  boatModels,
  boatPricingTiers,
  boats,
  ownerAccountMembers,
  ownerAccounts,
  users,
} from "@/database/schema";
import type { NewBoat } from "@/database/types";
import { UserFacingError } from "@/shared/lib/errors";
import { boatOfMember } from "@/features/owner-accounts/owner-accounts.service";
import { guestPriceFor, MAX_OPEN_DRAFTS } from "./listing.constants";
import type { ListingDraft, ListingForReview, ListingStatus, ListingTrip } from "./listing.types";

/**
 * Queries for self-listed boats. Owner functions are filtered on "the boat
 * belongs to an owner account the caller is in" AND managed_by = OWNER, so
 * nobody can touch a KOS-managed boat (whose prices KOS sets) or another
 * owner's. Not access-checked here: callers go through listing.data.ts.
 */

const listingColumns = {
  id: boats.id,
  status: boats.listingStatus,
  active: boats.active,
  reviewNote: boats.listingReviewNote,
  submittedAt: boats.listingSubmittedAt,
  category: boats.category,
  make: boatMakes.name,
  model: boatModels.name,
  yearBuilt: boats.yearBuilt,
  lengthFt: boats.lengthFt,
  capacity: boats.capacity,
  locationLabel: boats.locationLabel,
  dockInfo: boats.dockInfo,
  parkingInfo: boats.parkingInfo,
  timezone: boats.timezone,
  mainImage: boats.mainImage,
  galleryImages: boats.galleryImages,
  name: boats.name,
  displayTitle: boats.displayTitle,
  description: boats.description,
  features: boats.features,
  sleeps: boats.sleeps,
  bathrooms: boats.bathrooms,
  captainArrangement: boats.captainArrangement,
  fuelIncluded: boats.fuelIncluded,
  markupPercent: boats.markupPercent,
  rules: boats.rules,
  cancellationPolicy: boats.cancellationPolicy,
  hullId: boats.hullId,
  registrationNumber: boats.registrationNumber,
  insuranceInfo: boats.insuranceInfo,
  insuranceExpiry: boats.insuranceExpiry,
};

/** Listings with their make and model names. */
const selectListing = () =>
  db
    .select(listingColumns)
    .from(boats)
    .leftJoin(boatMakes, eq(boatMakes.id, boats.makeId))
    .leftJoin(boatModels, eq(boatModels.id, boats.modelId));
type ListingRow = Awaited<ReturnType<typeof selectListing>>[number];

function ownListing(userId: string, boatId: string): SQL {
  return and(eq(boats.id, boatId), boatOfMember(userId), eq(boats.managedBy, "OWNER"))!;
}

async function tripsFor(boatIds: string[]) {
  if (boatIds.length === 0) return new Map<string, ListingTrip[]>();
  const rows = await db
    .select({
      boatId: boatPricingTiers.boatId,
      hours: boatPricingTiers.hours,
      price: boatPricingTiers.price,
      ownerPayoutCents: boatPricingTiers.ownerPayoutCents,
    })
    .from(boatPricingTiers)
    .where(and(inArray(boatPricingTiers.boatId, boatIds), eq(boatPricingTiers.isActive, true)))
    .orderBy(asc(boatPricingTiers.hours));
  const byBoat = new Map<string, ListingTrip[]>();
  for (const row of rows) {
    const list = byBoat.get(row.boatId) ?? [];
    list.push({
      hours: row.hours,
      price: Number(row.price),
      ownerRate: row.ownerPayoutCents != null ? Number(row.ownerPayoutCents) / 100 : null,
    });
    byBoat.set(row.boatId, list);
  }
  return byBoat;
}

function toDraft(row: ListingRow, trips: ListingTrip[]): ListingDraft {
  const { mainImage, galleryImages, ...rest } = row;
  return {
    ...rest,
    status: row.status as ListingStatus,
    features: row.features ?? [],
    images: [mainImage, ...(galleryImages ?? [])].filter((u): u is string => Boolean(u)),
    trips,
  };
}

/** A new listing under an owner account (see owner-accounts ensureAccountFor). */
export async function createDraft(
  ownerAccountId: string,
  basics: Pick<NewBoat, "category" | "makeId" | "modelId" | "yearBuilt" | "lengthFt" | "capacity">,
  /** The boat's name until the owner gives it one: "2019 Azimut 55 Fly". */
  name: string
): Promise<string> {
  const [{ open }] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(boats)
    .where(
      and(
        eq(boats.ownerAccountId, ownerAccountId),
        eq(boats.managedBy, "OWNER"),
        eq(boats.listingStatus, "DRAFT")
      )
    );
  if (open >= MAX_OPEN_DRAFTS) {
    throw new UserFacingError(
      `You already have ${open} listings in progress. Finish or delete one in the owner portal first.`
    );
  }

  const [row] = await db
    .insert(boats)
    .values({
      ...basics,
      ownerAccountId,
      name,
      managedBy: "OWNER",
      listingStatus: "DRAFT",
      active: false,
      features: [],
      crewRequired: true,
      crewIncluded: true,
      timezone: "America/New_York",
    })
    .returning({ id: boats.id });
  return row.id;
}

export async function getDraft(userId: string, boatId: string): Promise<ListingDraft | null> {
  const [row] = await selectListing().where(ownListing(userId, boatId)).limit(1);
  if (!row) return null;
  const trips = await tripsFor([boatId]);
  return toDraft(row, trips.get(boatId) ?? []);
}

/** Writes allow-listed fields (the step schemas) onto the owner's own listing. */
export async function updateDraft(
  userId: string,
  boatId: string,
  patch: Partial<NewBoat>
): Promise<void> {
  const updated = await db
    .update(boats)
    .set({ ...patch, updatedAt: new Date() })
    .where(ownListing(userId, boatId))
    .returning({ id: boats.id });
  if (updated.length === 0)
    throw new UserFacingError("That listing isn't yours or no longer exists.", 404);
}

/**
 * Trip lengths and what the owner earns for each, plus the captain and fuel
 * answers. The guest price is the rate plus the boat's markup. Lengths the
 * owner un-ticks are switched off, not deleted, so past bookings that point
 * at a tier keep working.
 */
export async function saveTrips(
  userId: string,
  boatId: string,
  input: {
    trips: { hours: number; rate: number }[];
    captainArrangement: string;
    fuelIncluded: boolean;
  }
): Promise<void> {
  const [own] = await db
    .select({ id: boats.id, markupPercent: boats.markupPercent })
    .from(boats)
    .where(ownListing(userId, boatId))
    .limit(1);
  if (!own) throw new UserFacingError("That listing isn't yours or no longer exists.", 404);

  const now = new Date();
  const hours = input.trips.map((t) => t.hours);
  const shortest = Math.min(...hours);
  await db.batch([
    db
      .update(boats)
      .set({
        captainArrangement: input.captainArrangement,
        fuelIncluded: input.fuelIncluded,
        updatedAt: now,
      })
      .where(eq(boats.id, boatId)),
    db
      .update(boatPricingTiers)
      .set({ isActive: false, isDefault: false, updatedAt: now })
      .where(and(eq(boatPricingTiers.boatId, boatId), notInArray(boatPricingTiers.hours, hours))),
    ...input.trips.map((trip) => {
      const price = guestPriceFor(trip.rate, own.markupPercent);
      const ownerPayoutCents = Math.round(trip.rate * 100);
      return db
        .insert(boatPricingTiers)
        .values({
          boatId,
          hours: trip.hours,
          price,
          ownerPayoutCents,
          name: `${trip.hours} hours`,
          isActive: true,
          isDefault: trip.hours === shortest,
        })
        .onConflictDoUpdate({
          target: [boatPricingTiers.boatId, boatPricingTiers.hours],
          set: {
            price,
            ownerPayoutCents,
            isActive: true,
            isDefault: trip.hours === shortest,
            updatedAt: now,
          },
        });
    }),
  ]);
}

export async function submitDraft(userId: string, boatId: string): Promise<void> {
  const updated = await db
    .update(boats)
    .set({ listingStatus: "IN_REVIEW", listingSubmittedAt: new Date(), updatedAt: new Date() })
    .where(
      and(ownListing(userId, boatId), inArray(boats.listingStatus, ["DRAFT", "CHANGES_REQUESTED"]))
    )
    .returning({ id: boats.id });
  if (updated.length === 0)
    throw new UserFacingError("This listing is already with the KOS team.", 409);
}

/** Owners may pull a listing that isn't live yet. */
export async function deleteDraft(userId: string, boatId: string): Promise<void> {
  const deleted = await db
    .delete(boats)
    .where(
      and(ownListing(userId, boatId), inArray(boats.listingStatus, ["DRAFT", "CHANGES_REQUESTED"]))
    )
    .returning({ id: boats.id });
  if (deleted.length === 0)
    throw new UserFacingError("Only listings that aren't submitted can be deleted.", 409);
}

/** Owner pauses or resumes an approved listing. */
export async function setListingLive(userId: string, boatId: string, live: boolean): Promise<void> {
  const updated = await db
    .update(boats)
    .set({ active: live, updatedAt: new Date() })
    .where(and(ownListing(userId, boatId), eq(boats.listingStatus, "APPROVED")))
    .returning({ id: boats.id });
  if (updated.length === 0)
    throw new UserFacingError("Only approved listings can be shown or hidden.", 409);
}

// ── KOS review ──────────────────────────────────────────────────────────────

/** The owner account behind each listing, with someone to reach: its contact, else its first Owner. */
async function withOwners(
  rows: (ListingRow & { ownerAccountId: string })[]
): Promise<ListingForReview[]> {
  if (rows.length === 0) return [];
  const accountIds = [...new Set(rows.map((r) => r.ownerAccountId))];
  const [accounts, owners, trips] = await Promise.all([
    db
      .select({
        id: ownerAccounts.id,
        name: ownerAccounts.name,
        email: ownerAccounts.contactEmail,
        phone: ownerAccounts.contactPhone,
      })
      .from(ownerAccounts)
      .where(inArray(ownerAccounts.id, accountIds)),
    db
      .select({
        accountId: ownerAccountMembers.ownerAccountId,
        email: users.email,
        phone: users.phoneNumber,
      })
      .from(ownerAccountMembers)
      .innerJoin(users, eq(users.id, ownerAccountMembers.userId))
      .where(
        and(
          inArray(ownerAccountMembers.ownerAccountId, accountIds),
          eq(ownerAccountMembers.role, "OWNER")
        )
      )
      .orderBy(asc(ownerAccountMembers.createdAt)),
    tripsFor(rows.map((r) => r.id)),
  ]);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const firstOwner = new Map<string, { email: string; phone: string | null }>();
  for (const o of owners) if (!firstOwner.has(o.accountId)) firstOwner.set(o.accountId, o);
  return rows.map(({ ownerAccountId, ...row }) => {
    const account = accountById.get(ownerAccountId);
    const person = firstOwner.get(ownerAccountId);
    return {
      ...toDraft(row, trips.get(row.id) ?? []),
      owner: {
        id: ownerAccountId,
        name: account?.name ?? "Owner",
        email: account?.email ?? person?.email ?? "",
        phone: account?.phone ?? person?.phone ?? null,
      },
    };
  });
}

/** Self-listed boats waiting for KOS (submitted first), then the ones sent back. */
export async function listForReview(): Promise<ListingForReview[]> {
  const rows = await db
    .select({ ...listingColumns, ownerAccountId: boats.ownerAccountId })
    .from(boats)
    .leftJoin(boatMakes, eq(boatMakes.id, boats.makeId))
    .leftJoin(boatModels, eq(boatModels.id, boats.modelId))
    .where(
      and(
        eq(boats.managedBy, "OWNER"),
        inArray(boats.listingStatus, ["IN_REVIEW", "CHANGES_REQUESTED"])
      )
    )
    .orderBy(desc(sql`${boats.listingStatus} = 'IN_REVIEW'`), asc(boats.listingSubmittedAt));
  return withOwners(rows);
}

export async function countAwaitingReview(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(boats)
    .where(and(eq(boats.managedBy, "OWNER"), eq(boats.listingStatus, "IN_REVIEW")));
  return n;
}

export async function getForReview(boatId: string): Promise<ListingForReview | null> {
  const rows = await db
    .select({ ...listingColumns, ownerAccountId: boats.ownerAccountId })
    .from(boats)
    .leftJoin(boatMakes, eq(boatMakes.id, boats.makeId))
    .leftJoin(boatModels, eq(boatModels.id, boats.modelId))
    .where(and(eq(boats.id, boatId), eq(boats.managedBy, "OWNER")))
    .limit(1);
  const [listing] = await withOwners(rows);
  return listing ?? null;
}

/**
 * KOS's markup for an owner-listed boat: saves it and re-prices every trip
 * that has an owner rate (guest price = rate plus markup, rounded up to $5).
 */
export async function setMarkup(boatId: string, markupPercent: number): Promise<void> {
  const tiers = await db
    .select({ id: boatPricingTiers.id, ownerPayoutCents: boatPricingTiers.ownerPayoutCents })
    .from(boatPricingTiers)
    .innerJoin(boats, eq(boats.id, boatPricingTiers.boatId))
    .where(and(eq(boatPricingTiers.boatId, boatId), eq(boats.managedBy, "OWNER")));
  const now = new Date();
  const [updated] = await db.batch([
    db
      .update(boats)
      .set({ markupPercent, updatedAt: now })
      .where(and(eq(boats.id, boatId), eq(boats.managedBy, "OWNER")))
      .returning({ id: boats.id }),
    ...tiers
      .filter((t) => t.ownerPayoutCents != null)
      .map((t) =>
        db
          .update(boatPricingTiers)
          .set({
            price: guestPriceFor(Number(t.ownerPayoutCents) / 100, markupPercent),
            updatedAt: now,
          })
          .where(eq(boatPricingTiers.id, t.id))
      ),
  ]);
  if (updated.length === 0) throw new UserFacingError("Listing not found", 404);
}

/** Approve and publish in one step (the check constraint needs both together). */
export async function approve(reviewerId: string, boatId: string): Promise<void> {
  const now = new Date();
  const updated = await db
    .update(boats)
    .set({
      listingStatus: "APPROVED",
      active: true,
      listingReviewedAt: now,
      listingReviewedByUserId: reviewerId,
      listingReviewNote: null,
      updatedAt: now,
    })
    .where(
      and(eq(boats.id, boatId), eq(boats.managedBy, "OWNER"), eq(boats.listingStatus, "IN_REVIEW"))
    )
    .returning({ id: boats.id });
  if (updated.length === 0)
    throw new UserFacingError("Only listings in review can be approved.", 409);
}

export async function sendBack(reviewerId: string, boatId: string, note: string): Promise<void> {
  const now = new Date();
  const updated = await db
    .update(boats)
    .set({
      listingStatus: "CHANGES_REQUESTED",
      active: false,
      listingReviewedAt: now,
      listingReviewedByUserId: reviewerId,
      listingReviewNote: note,
      updatedAt: now,
    })
    .where(
      and(eq(boats.id, boatId), eq(boats.managedBy, "OWNER"), eq(boats.listingStatus, "IN_REVIEW"))
    )
    .returning({ id: boats.id });
  if (updated.length === 0)
    throw new UserFacingError("Only listings in review can be sent back.", 409);
}

/** For the upload route: may this person add photos to this boat? */
export async function isOwnListing(userId: string, boatId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: boats.id })
    .from(boats)
    .where(ownListing(userId, boatId))
    .limit(1);
  return Boolean(row);
}
