import 'server-only';

//drizzle
import { db } from '@/database/db';
import { boats, boatPricingTiers, users, addOns, boatAddOns } from '@/database/schema';
import { and, asc, count, eq, desc, inArray, isNotNull, or, ilike, SQL, sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';

//types
import { type BoatFilterInput, type CreateBoatInput, type UpdateBoatInput, type PricingTierInput, type BoatAddOnAssignmentInput } from '@/features/boats/boat.validation';
import { type ResolvedBoatAddOn } from '@/features/add-ons/add-on.types';
import {
  PUBLIC_BOAT_FIELDS,
  type BoatCard,
  type BoatDetail,
  type BoatForAdminSelect,
  type BoatLocation,
  type BoatTier,
  type PaginatedBoatsResponse,
  type PublicBoat,
  type PublicBoatAddOn,
} from '@/features/boats/boat.types';
import { type Boat, type NewBoat } from '@/database/types';
//utils
import { toDateOrNull } from '@/shared/lib/utils/date-helpers';
import { resolveAdminListPagination } from '@/shared/admin/list-pagination';
import { pgErrorCode, UserFacingError } from '@/shared/lib/errors';
import { startingHourlyRate } from '@/shared/lib/utils/pricing-utils';


// Custom type for our manipulation payload for boats
type BoatManipulationPayload = Omit<NewBoat, 'location'> & {
  location?: SQL | null; // Allow SQL type specifically for the location field
};

type PublicBoatColumns = { [K in (typeof PUBLIC_BOAT_FIELDS)[number]]: (typeof boats)[K] };
const publicBoatColumns = Object.fromEntries(
  PUBLIC_BOAT_FIELDS.map((field) => [field, boats[field]])
) as PublicBoatColumns;

const tierColumns = {
  id: boatPricingTiers.id,
  boatId: boatPricingTiers.boatId,
  hours: boatPricingTiers.hours,
  price: boatPricingTiers.price,
  name: boatPricingTiers.name,
  description: boatPricingTiers.description,
  isDefault: boatPricingTiers.isDefault,
};

const adminSelectColumns = {
  id: boats.id,
  name: boats.name,
  mainImage: boats.mainImage,
  capacity: boats.capacity,
  locationLabel: boats.locationLabel,
  cleaningFee: boats.cleaningFee,
  depositAmount: boats.depositAmount,
  crewRequired: boats.crewRequired,
  timezone: boats.timezone,
};

const cardColumns = {
  id: boats.id,
  name: boats.name,
  displayTitle: boats.displayTitle,
  mainImage: boats.mainImage,
  galleryImages: boats.galleryImages,
  locationLabel: boats.locationLabel,
  capacity: boats.capacity,
  instantBook: boats.instantBook,
};


/**
 * Boat queries. Server-only and not access-checked: pages, routes and actions
 * go through boat.data.ts, which checks the viewer and picks one of these.
 * Public reads only ever see active boats, public columns and active tiers.
 */
class BoatService {
  // ========================================
  // PUBLIC
  // ========================================

  /** An active boat's public columns, or null. */
  async getActiveBoat(id: string): Promise<Omit<PublicBoat, 'pricingTiers' | 'boatAddOns'> | null> {
    const [boat] = await db
      .select(publicBoatColumns)
      .from(boats)
      .where(and(eq(boats.id, id), eq(boats.active, true)))
      .limit(1);
    return boat ?? null;
  }

  /** Active tiers, cheapest first by length; every boat's when no ids are given. */
  async getActiveTiers(boatIds?: string[]): Promise<BoatTier[]> {
    if (boatIds?.length === 0) return [];
    return db
      .select(tierColumns)
      .from(boatPricingTiers)
      .where(
        and(
          eq(boatPricingTiers.isActive, true),
          boatIds ? inArray(boatPricingTiers.boatId, boatIds) : undefined
        )
      )
      .orderBy(asc(boatPricingTiers.hours));
  }

  /**
   * An active boat and one of its active tiers — what a customer's booking or
   * inquiry is priced from. Null unless both are bookable, so a tier from
   * another boat, or a retired one, can't set the price.
   */
  async getBookableTier(boatId: string, tierId: string) {
    const [row] = await db
      .select({
        boat: {
          id: boats.id,
          name: boats.name,
          ownerId: boats.ownerId,
          mainImage: boats.mainImage,
          cleaningFee: boats.cleaningFee,
          depositAmount: boats.depositAmount,
          instantBook: boats.instantBook,
          crewRequired: boats.crewRequired,
          currency: boats.currency,
        },
        tier: {
          id: boatPricingTiers.id,
          name: boatPricingTiers.name,
          hours: boatPricingTiers.hours,
          price: boatPricingTiers.price,
        },
      })
      .from(boatPricingTiers)
      .innerJoin(boats, eq(boatPricingTiers.boatId, boats.id))
      .where(
        and(
          eq(boatPricingTiers.id, tierId),
          eq(boatPricingTiers.boatId, boatId),
          eq(boatPricingTiers.isActive, true),
          eq(boats.active, true)
        )
      )
      .limit(1);
    return row ?? null;
  }

  /** Any boat's name (for messages); null when there's no such boat. */
  async getBoatName(id: string): Promise<string | null> {
    const [row] = await db.select({ name: boats.name }).from(boats).where(eq(boats.id, id)).limit(1);
    return row?.name ?? null;
  }

  /** Add-ons a boat currently offers, at their effective price. */
  async getOfferedAddOns(boatId: string): Promise<PublicBoatAddOn[]> {
    const offered = await this.getBoatAddOns(boatId);
    return offered
      .filter((a) => a.isActive)
      .map((a) => ({
        id: a.id,
        addOnId: a.addOnId,
        name: a.name,
        description: a.description,
        category: a.category,
        priceCents: a.priceCents,
        isComplimentary: a.isComplimentary,
        imageUrl: a.imageUrl,
      }));
  }

  /** Featured boats in their set order. */
  async getFeaturedCards(): Promise<BoatCard[]> {
    const rows = await db
      .select(cardColumns)
      .from(boats)
      .where(and(eq(boats.active, true), eq(boats.featured, true)))
      .orderBy(asc(boats.featuredOrder));
    return this.withStartingRates(rows);
  }

  /** Boats offered for multi-day term charters. */
  async getTermCharterCards(limit: number): Promise<BoatCard[]> {
    const rows = await db
      .select(cardColumns)
      .from(boats)
      .where(and(eq(boats.active, true), eq(boats.termCharter, true)))
      .orderBy(desc(boats.lengthFt))
      .limit(limit);
    return this.withStartingRates(rows);
  }

  /** One page of search results and the total match count. */
  async searchActiveCards({
    where,
    orderBy,
    limit,
    offset,
  }: {
    where: SQL | undefined;
    orderBy: SQL[];
    limit: number;
    offset: number;
  }): Promise<{ cards: BoatCard[]; totalCount: number }> {
    const conditions = and(eq(boats.active, true), where);
    const [rows, [{ value }]] = await Promise.all([
      db.select(cardColumns).from(boats).where(conditions).orderBy(...orderBy).limit(limit).offset(offset),
      db.select({ value: count() }).from(boats).where(conditions),
    ]);
    return { cards: await this.withStartingRates(rows), totalCount: value };
  }

  /** Map pins for these cards (boats without a location are skipped). */
  async getMapPins(cards: BoatCard[]): Promise<BoatLocation[]> {
    if (cards.length === 0) return [];
    const rows = await db
      .select({
        id: boats.id,
        name: boats.name,
        category: boats.category,
        imageUrl: boats.mainImage,
        latitude: sql<number>`ST_Y(${boats.location}::geometry)`.mapWith(Number),
        longitude: sql<number>`ST_X(${boats.location}::geometry)`.mapWith(Number),
      })
      .from(boats)
      .where(and(inArray(boats.id, cards.map((card) => card.id)), isNotNull(boats.location)));

    const rateById = new Map(cards.map((card) => [card.id, card.startingHourlyRate]));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      category: row.category,
      price: rateById.get(row.id) ?? 0,
      imageUrl: row.imageUrl ?? undefined,
    }));
  }

  /** How many active boats each category has, most first. */
  async getActiveCategoryCounts(): Promise<{ category: Boat['category']; count: number }[]> {
    return db
      .select({ category: boats.category, count: count() })
      .from(boats)
      .where(eq(boats.active, true))
      .groupBy(boats.category)
      .orderBy(desc(count()));
  }

  /** Ids of active boats (featured ones only, when asked). */
  async getActiveBoatIds({ featuredOnly = false } = {}): Promise<string[]> {
    const rows = await db
      .select({ id: boats.id })
      .from(boats)
      .where(and(eq(boats.active, true), featuredOnly ? eq(boats.featured, true) : undefined));
    return rows.map((row) => row.id);
  }

  // ========================================
  // STAFF PICKERS
  // ========================================

  /**
   * Boats for the staff pickers (booking composer, trip editor), largest
   * first. Optional search by name, make, model, location (min 2 chars).
   */
  async getBoatsForAdminSelect(search?: string): Promise<BoatForAdminSelect[]> {
    const term = search?.trim();
    return db
      .select(adminSelectColumns)
      .from(boats)
      .where(
        term && term.length >= 2
          ? or(
              ilike(boats.name, `%${term}%`),
              ilike(boats.make, `%${term}%`),
              ilike(boats.model, `%${term}%`),
              ilike(boats.locationLabel, `%${term}%`)
            )
          : undefined
      )
      .orderBy(desc(boats.lengthFt))
      .limit(50);
  }

  /** One boat in the picker shape (shows the current selection). */
  async getBoatForAdminSelect(id: string): Promise<BoatForAdminSelect | null> {
    const [boat] = await db.select(adminSelectColumns).from(boats).where(eq(boats.id, id)).limit(1);
    return boat ?? null;
  }

  // ========================================
  // FLEET MANAGEMENT
  // ========================================

  /**
   * Get paginated and filtered boats with comprehensive filter support
   */
  async getAllBoats(filters?: BoatFilterInput): Promise<PaginatedBoatsResponse> {
    const { page, limit, offset } = resolveAdminListPagination(filters);

    // Build where conditions array
    const whereConditions = [];

    // Text search - case-insensitive search across multiple fields
    if (filters?.search) {
      whereConditions.push(or(
        ilike(boats.name, `%${filters.search}%`),
        ilike(boats.make || '', `%${filters.search}%`),
        ilike(boats.model || '', `%${filters.search}%`),
        ilike(boats.locationLabel || '', `%${filters.search}%`),
        ilike(boats.description || '', `%${filters.search}%`)
      ));
    }

    // Basic filters
    if (filters?.category) whereConditions.push(eq(boats.category, filters.category));
    if (filters?.featured !== undefined) whereConditions.push(eq(boats.featured, filters.featured));
    if (filters?.active !== undefined) whereConditions.push(eq(boats.active, filters.active));
    if (filters?.ownerId) whereConditions.push(eq(boats.ownerId, filters.ownerId));

    // Size/capacity range filters
    if (filters?.minLength) whereConditions.push(sql`${boats.lengthFt} >= ${filters.minLength}`);
    if (filters?.maxLength) whereConditions.push(sql`${boats.lengthFt} <= ${filters.maxLength}`);
    if (filters?.minCapacity) whereConditions.push(sql`${boats.capacity} >= ${filters.minCapacity}`);
    if (filters?.maxCapacity) whereConditions.push(sql`${boats.capacity} <= ${filters.maxCapacity}`);

    // Year built range
    if (filters?.minYear) whereConditions.push(sql`${boats.yearBuilt} >= ${filters.minYear}`);
    if (filters?.maxYear) whereConditions.push(sql`${boats.yearBuilt} <= ${filters.maxYear}`);

    // Accommodations
    if (filters?.minSleeps) whereConditions.push(sql`${boats.sleeps} >= ${filters.minSleeps}`);
    if (filters?.minBathrooms) whereConditions.push(sql`${boats.bathrooms} >= ${filters.minBathrooms}`);

    // Location
    if (filters?.locationLabel) {
      whereConditions.push(ilike(boats.locationLabel || '', `%${filters.locationLabel}%`));
    }

    // Charter options
    if (filters?.crewRequired !== undefined) whereConditions.push(eq(boats.crewRequired, filters.crewRequired));
    if (filters?.instantBook !== undefined) whereConditions.push(eq(boats.instantBook, filters.instantBook));
    if (filters?.dayCharter !== undefined) whereConditions.push(eq(boats.dayCharter, filters.dayCharter));
    if (filters?.termCharter !== undefined) whereConditions.push(eq(boats.termCharter, filters.termCharter));

    // Price range filtering - uses subquery on pricing tiers
    if (filters?.minPrice || filters?.maxPrice) {
      const priceConditions = [];
      if (filters.minPrice) {
        priceConditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${boatPricingTiers}
            WHERE ${boatPricingTiers.boatId} = ${boats.id}
            AND ${boatPricingTiers.price} >= ${filters.minPrice}
            AND ${boatPricingTiers.isActive} = true
          )
        `);
      }
      if (filters.maxPrice) {
        priceConditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${boatPricingTiers}
            WHERE ${boatPricingTiers.boatId} = ${boats.id}
            AND ${boatPricingTiers.price} <= ${filters.maxPrice}
            AND ${boatPricingTiers.isActive} = true
          )
        `);
      }
      whereConditions.push(...priceConditions);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Select fields for listing (optimized)
    const selectFields = {
      id: boats.id,
      name: boats.name,
      category: boats.category,
      capacity: boats.capacity,
      lengthFt: boats.lengthFt,
      active: boats.active,
      featured: boats.featured,
      mainImage: boats.mainImage,
      createdAt: boats.createdAt,
      ownerName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      ownerId: boats.ownerId,
    };

    // Include lowest pricing tier in main query for performance
    const boatsQuery = db.select({
      ...selectFields,
      basePrice: sql<number>`(
        SELECT MIN(price)
        FROM ${boatPricingTiers}
        WHERE ${boatPricingTiers.boatId} = ${boats.id}
        AND ${boatPricingTiers.isActive} = true
      )`,
    })
      .from(boats)
      .leftJoin(users, eq(boats.ownerId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(boats.lengthFt));

    // Execute both queries concurrently
    const [boatsData, countResult] = await Promise.all([
      boatsQuery,
      db.select({ value: count() })
        .from(boats)
        .where(whereClause)
    ]);

    const totalCount = countResult[0].value;

    return {
      boats: boatsData as PaginatedBoatsResponse["boats"],
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };
  }

  /** Everything about a boat, active or not: owner, all tiers, add-ons, map point. */
  async getBoatDetail(id: string): Promise<BoatDetail | null> {
    const [boat] = await db
      .select({
        ...getTableColumns(boats),
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
        ownerEmail: users.email,
        latitude: sql<number | null>`ST_Y(${boats.location}::geometry)`.mapWith(Number),
        longitude: sql<number | null>`ST_X(${boats.location}::geometry)`.mapWith(Number),
      })
      .from(boats)
      .leftJoin(users, eq(boats.ownerId, users.id))
      .where(eq(boats.id, id))
      .limit(1);

    if (!boat) return null;

    const [pricingTiers, offeredAddOns] = await Promise.all([
      db.select().from(boatPricingTiers).where(eq(boatPricingTiers.boatId, id)).orderBy(asc(boatPricingTiers.hours)),
      this.getBoatAddOns(id),
    ]);

    const { latitude, longitude, ...row } = boat;
    return {
      ...row,
      pricingTiers,
      boatAddOns: offeredAddOns,
      locationCoordinates: latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null,
    };
  }

  /**
   * Create a new boat with pricing tiers
   * Note: neon-http driver doesn't support transactions, so operations are sequential
   */
  async createBoat(boatData: CreateBoatInput): Promise<{ id: string }> {
    // Extract pricing tiers, add-on offerings, and location data
    const { pricingTiers, boatAddOns: addOnAssignments, locationCoordinates, ...boatValues } = boatData;

    // Prepare insert data - convert ISO string dates to Date objects for database
    const insertData: Partial<BoatManipulationPayload> = {
      ...boatValues,
      // Convert date strings from validation to Date objects for database
      insuranceExpiry: toDateOrNull(boatValues.insuranceExpiry),
      lastMaintenanceDate: toDateOrNull(boatValues.lastMaintenanceDate),
      nextMaintenanceDate: toDateOrNull(boatValues.nextMaintenanceDate),
    };

    // Add PostGIS point if coordinates provided
    if (locationCoordinates?.lat && locationCoordinates?.lng) {
      insertData.location = sql`ST_SetSRID(ST_MakePoint(${locationCoordinates.lng}, ${locationCoordinates.lat}), 4326)`;
    }

    // Insert boat
    const [boatRow] = await db.insert(boats).values(insertData as NewBoat).returning({ id: boats.id });

    // Insert pricing tiers if provided
    if (pricingTiers && pricingTiers.length > 0) {
      const tiersWithBoatId = pricingTiers.map((tier) => ({
        ...tier,
        boatId: boatRow.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await db.insert(boatPricingTiers).values(tiersWithBoatId);
    }

    // Insert add-on offerings if provided
    if (addOnAssignments && addOnAssignments.length > 0) {
      await this.updateBoatAddOns(boatRow.id, addOnAssignments);
    }

    return boatRow;
  }

  /**
   * Update an existing boat
   */
  async updateBoat(id: string, data: UpdateBoatInput): Promise<void> {

    // Extract pricing tiers, add-on offerings, and location data
    const { pricingTiers, boatAddOns: addOnAssignments, locationCoordinates, ...boatValues } = data;

    // Prepare update data - convert ISO string dates to Date objects for database
    const updateData: Partial<BoatManipulationPayload> = {
      ...boatValues,
      updatedAt: new Date(),
      // Convert date strings from validation to Date objects for database
      insuranceExpiry: boatValues.insuranceExpiry !== undefined ? toDateOrNull(boatValues.insuranceExpiry) : undefined,
      lastMaintenanceDate: boatValues.lastMaintenanceDate !== undefined ? toDateOrNull(boatValues.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: boatValues.nextMaintenanceDate !== undefined ? toDateOrNull(boatValues.nextMaintenanceDate) : undefined,
    };

    // Handle map coordinates
    if (locationCoordinates?.lat && locationCoordinates?.lng) {
      updateData.location = sql`ST_SetSRID(ST_MakePoint(${locationCoordinates.lng}, ${locationCoordinates.lat}), 4326)`;
    } else if (locationCoordinates === null) {
      updateData.location = null;
    }

    await db
      .update(boats)
      .set(updateData)
      .where(eq(boats.id, id));

    // Update pricing tiers if provided
    if (pricingTiers !== undefined) {
      await this.updateBoatPricingTiers(id, pricingTiers);
    }

    // Update add-on offerings if provided
    if (addOnAssignments !== undefined) {
      await this.updateBoatAddOns(id, addOnAssignments);
    }
  }

  /**
   * Delete a boat.
   * The database cascade-deletes its pricing tiers, add-ons, calendars and
   * reviews; a boat with bookings is still blocked.
   */
  async deleteBoat(id: string): Promise<void> {
    try {
      await db.delete(boats).where(eq(boats.id, id));
    } catch (error) {
      if (pgErrorCode(error) === '23503') {
        throw new UserFacingError("This boat has bookings, so it can't be deleted. Mark it inactive instead.", 409);
      }
      throw error;
    }
  }

  // ========================================
  // INTERNAL
  // ========================================

  /** Adds each card's "from $X+/hour" rate, from its active tiers. */
  private async withStartingRates(rows: Omit<BoatCard, 'startingHourlyRate'>[]): Promise<BoatCard[]> {
    const tiersByBoat = new Map<string, BoatTier[]>();
    for (const tier of await this.getActiveTiers(rows.map((row) => row.id))) {
      tiersByBoat.set(tier.boatId, [...(tiersByBoat.get(tier.boatId) ?? []), tier]);
    }
    return rows.map((row) => ({ ...row, startingHourlyRate: startingHourlyRate(tiersByBoat.get(row.id) ?? []) }));
  }

  /**
   * Offered add-ons for a boat, joined with the catalog. Effective price =
   * per-boat override ?? catalog default ?? 0 (0 also when complimentary).
   */
  private async getBoatAddOns(boatId: string): Promise<ResolvedBoatAddOn[]> {
    const rows = await db
      .select({
        id: boatAddOns.id,
        addOnId: boatAddOns.addOnId,
        name: addOns.name,
        description: addOns.description,
        category: addOns.category,
        overridePriceCents: boatAddOns.priceCents,
        defaultPriceCents: addOns.defaultPriceCents,
        isComplimentary: boatAddOns.isComplimentary,
        isActive: boatAddOns.isActive,
        sortOrder: boatAddOns.sortOrder,
        imageUrl: addOns.imageUrl,
      })
      .from(boatAddOns)
      .innerJoin(addOns, eq(boatAddOns.addOnId, addOns.id))
      .where(eq(boatAddOns.boatId, boatId))
      .orderBy(asc(boatAddOns.sortOrder), asc(addOns.name));

    return rows.map((r) => ({
      ...r,
      priceCents: r.isComplimentary ? 0 : r.overridePriceCents ?? r.defaultPriceCents ?? 0,
    }));
  }

  /**
   * Update pricing tiers for a boat.
   */
  private async updateBoatPricingTiers(boatId: string, tiers: PricingTierInput[]): Promise<void> {
    const existingTiers = await db
      .select({ id: boatPricingTiers.id })
      .from(boatPricingTiers)
      .where(eq(boatPricingTiers.boatId, boatId));
    const incomingTiers = tiers || [];
    const incomingIds = new Set(incomingTiers.map((t) => t.id).filter(Boolean));

    for (const tier of incomingTiers) {
      if (tier.id) {
        await db
          .update(boatPricingTiers)
          .set({
            hours: tier.hours,
            price: tier.price,
            name: tier.name,
            description: tier.description,
            isActive: tier.isActive,
            isDefault: tier.isDefault,
            updatedAt: new Date(),
          })
          .where(and(eq(boatPricingTiers.id, tier.id), eq(boatPricingTiers.boatId, boatId)));
      } else {
        const now = new Date();
        await db.insert(boatPricingTiers).values({
          hours: tier.hours,
          price: tier.price,
          name: tier.name,
          description: tier.description,
          isActive: tier.isActive,
          isDefault: tier.isDefault,
          boatId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const idsToDelete = existingTiers.filter((t) => !incomingIds.has(t.id)).map((t) => t.id);
    for (const id of idsToDelete) {
      try {
        await db.delete(boatPricingTiers).where(eq(boatPricingTiers.id, id));
      } catch (error) {
        if (pgErrorCode(error) === '23503') {
          throw new UserFacingError('Cannot delete this tier - it is used in an active booking.', 409);
        }
        throw error;
      }
    }
  }

  /**
   * Upsert a boat's offered add-ons (mirror of updateBoatPricingTiers): update
   * rows with ids, insert new ones, delete those no longer present.
   */
  private async updateBoatAddOns(
    boatId: string,
    assignments: BoatAddOnAssignmentInput[]
  ): Promise<void> {
    const existing = await db
      .select({ id: boatAddOns.id })
      .from(boatAddOns)
      .where(eq(boatAddOns.boatId, boatId));
    const incoming = assignments || [];
    const incomingIds = new Set(incoming.map((a) => a.id).filter(Boolean));

    for (const [index, a] of incoming.entries()) {
      if (a.id) {
        await db
          .update(boatAddOns)
          .set({
            priceCents: a.priceCents ?? null,
            isComplimentary: a.isComplimentary,
            isActive: a.isActive,
            sortOrder: index,
            updatedAt: new Date(),
          })
          .where(and(eq(boatAddOns.id, a.id), eq(boatAddOns.boatId, boatId)));
      } else {
        const now = new Date();
        await db.insert(boatAddOns).values({
          boatId,
          addOnId: a.addOnId,
          priceCents: a.priceCents ?? null,
          isComplimentary: a.isComplimentary,
          isActive: a.isActive,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const idsToDelete = existing.filter((e) => !incomingIds.has(e.id)).map((e) => e.id);
    for (const id of idsToDelete) {
      await db.delete(boatAddOns).where(eq(boatAddOns.id, id));
    }
  }

}

// Export singleton instance
export const boatService = new BoatService();
