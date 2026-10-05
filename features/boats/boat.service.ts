//drizzle
import { db } from '@/database/db';
import { boats, boatPricingTiers, users, addOns, boatAddOns } from '@/database/schema';
import { and, asc, count, eq, desc, or, ilike, SQL, sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';

//types
import { type BoatFilterInput, type CreateBoatInput, type UpdateBoatInput, type PricingTierInput, type BoatAddOnAssignmentInput } from '@/features/boats/boat.validation';
import { type ResolvedBoatAddOn } from '@/features/add-ons/add-on.types';
import { type BoatForAdminSelect, type PaginatedBoatsResponse } from '@/features/boats/boat.types';
import { NewBoat } from '@/database/types';
//utils
import { toDateOrNull } from '@/shared/lib/utils/date-helpers';
import { resolveAdminListPagination } from '@/shared/admin/list-pagination';


// Custom type for our manipulation payload for boats
type BoatManipulationPayload = Omit<NewBoat, 'location'> & {
  location?: SQL | null; // Allow SQL type specifically for the location field
};


/**
 * Boat Service Layer
 * Single source of truth for all boat database operations
 */
export class BoatService {
  /**
   * Get boats for admin dropdowns (draft bookings create, bookings create).
   * Always ordered by length (largest first).
   * Optional search filters by name, make, model, location (min 2 chars).
   */
  async getBoatsForAdminSelect(search?: string): Promise<BoatForAdminSelect[]> {
    const baseQuery = db
      .select({
        id: boats.id,
        name: boats.name,
        mainImage: boats.mainImage,
        capacity: boats.capacity,
        locationLabel: boats.locationLabel,
        cleaningFee: boats.cleaningFee,
        depositAmount: boats.depositAmount,
        crewRequired: boats.crewRequired,
        timezone: boats.timezone,
      })
      .from(boats)
      .orderBy(desc(boats.lengthFt))
      .limit(50);

    if (search && search.trim().length >= 2) {
      const whereClause = or(
        ilike(boats.name, `%${search.trim()}%`),
        ilike(boats.make || "", `%${search.trim()}%`),
        ilike(boats.model || "", `%${search.trim()}%`),
        ilike(boats.locationLabel || "", `%${search.trim()}%`),
      );
      const rows = await baseQuery.where(whereClause);
      return rows as BoatForAdminSelect[];
    }

    const rows = await baseQuery;
    return rows as BoatForAdminSelect[];
  }

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

  /**
   * Get single boat by ID with pricing tiers
   */
  async getBoatById(id: string): Promise<import('./boat.types').BoatWithTiers | null> {

    // Fetch boat with owner information
    const [boat] = await db
      .select({
        ...getTableColumns(boats),
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
        ownerEmail: users.email,
      })
      .from(boats)
      .leftJoin(users, eq(boats.ownerId, users.id))
      .where(eq(boats.id, id))
      .limit(1);

    if (!boat) {
      return null;
    }

    // Fetch pricing tiers + offered add-ons
    const pricingTiers = await this.getBoatPricingTiers(id);
    const boatAddOnsResolved = await this.getBoatAddOns(id);

    // Extract coordinates from PostGIS point if available
    let locationCoordinates = null;
    try {
      if (boat.location) {
        const locationResult = await db.execute(sql`
          SELECT 
            ST_Y(location::geometry) as lat, 
            ST_X(location::geometry) as lng
          FROM "boat" 
          WHERE id = ${id}
        `);

        if (locationResult.rows && locationResult.rows.length > 0) {
          const { lat, lng } = locationResult.rows[0] as { lat: string, lng: string };
          locationCoordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
        }
      }
    } catch {
      // Continue without coordinates if there's an error
    }

    return {
      ...boat,
      pricingTiers,
      boatAddOns: boatAddOnsResolved,
      locationCoordinates
    };
  }

  /**
   * Offered add-ons for a boat, joined with the catalog. Effective price =
   * per-boat override ?? catalog default ?? 0 (0 also when complimentary).
   */
  async getBoatAddOns(boatId: string): Promise<ResolvedBoatAddOn[]> {
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
   * Get boat pricing tiers (for a single boat)
   */
  async getBoatPricingTiers(boatId: string) {
    const tiers = await db
      .select()
      .from(boatPricingTiers)
      .where(eq(boatPricingTiers.boatId, boatId))
      .orderBy(boatPricingTiers.hours);

    return tiers;
  }

  /**
   * Get all active pricing tiers for admin booking create forms.
   * Used when boat is not yet selected - form needs tiers for all boats.
   */
  async getAllActivePricingTiers() {
    return db
      .select({
        id: boatPricingTiers.id,
        boatId: boatPricingTiers.boatId,
        hours: boatPricingTiers.hours,
        price: boatPricingTiers.price,
        name: boatPricingTiers.name,
        isDefault: boatPricingTiers.isDefault,
      })
      .from(boatPricingTiers)
      .where(eq(boatPricingTiers.isActive, true))
      .orderBy(boatPricingTiers.hours);
  }

  /**
   * Create a new boat with pricing tiers
   * Note: neon-http driver doesn't support transactions, so operations are sequential
   */
  async createBoat(boatData: CreateBoatInput): Promise<import('./boat.types').BoatWithTiers> {
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
    const [boatRow] = await db.insert(boats).values(insertData as NewBoat).returning();

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

    // Fetch complete boat with tiers
    const boat = await this.getBoatById(boatRow.id);
    if (!boat) throw new Error('Failed to retrieve created boat');
    return boat;
  }

  /**
   * Update an existing boat
   */
  async updateBoat(id: string, data: UpdateBoatInput): Promise<import('./boat.types').BoatWithTiers> {

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

    // Return full boat with tiers and owner info (consistent with createBoat)
    const fullBoat = await this.getBoatById(id);
    if (!fullBoat) throw new Error(`Failed to retrieve updated boat: ${id}`);
    return fullBoat;
  }

  /**
   * Update pricing tiers for a boat.
   */
  private async updateBoatPricingTiers(boatId: string, tiers: PricingTierInput[]): Promise<void> {
    const existingTiers = await this.getBoatPricingTiers(boatId);
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
          .where(eq(boatPricingTiers.id, tier.id));
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
      } catch (error: unknown) {
        const err = error as { code?: string };
        if (err?.code === '23503') {
          throw new Error('Cannot delete this tier - it is used in an active booking.');
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
          .where(eq(boatAddOns.id, a.id));
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

  /**
   * Delete a boat.
   * The database cascade-deletes its pricing tiers, add-ons, calendars and
   * reviews; a boat with bookings is still blocked.
   */
  async deleteBoat(id: string): Promise<void> {
    await db.delete(boats).where(eq(boats.id, id));
  }

}

// Export singleton instance
export const boatService = new BoatService();
