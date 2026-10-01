import { db } from "@/database/db";
import { boatPricingTiers, boats as boatsTable } from "@/database/schema";
import type { Boat, BoatPricingTier } from "@/database/types";
import { BoatWithTiers, BoatLocation } from "@/features/boats/boat.types";
import { and, inArray, isNotNull, sql } from "drizzle-orm";

/**
 * Service for formatting search results for different display contexts
 */
export class SearchResultsFormatter {
  /**
   * Add pricing tiers to boat results (one query for the whole page).
   */
  static async addPricingTiers(boats: Boat[]): Promise<BoatWithTiers[]> {
    if (boats.length === 0) return [];

    const tiers = await db
      .select()
      .from(boatPricingTiers)
      .where(inArray(boatPricingTiers.boatId, boats.map((boat) => boat.id)));

    const tiersByBoat = new Map<string, BoatPricingTier[]>();
    for (const tier of tiers) {
      tiersByBoat.set(tier.boatId, [...(tiersByBoat.get(tier.boatId) ?? []), tier]);
    }

    return boats.map((boat) => ({ ...boat, pricingTiers: tiersByBoat.get(boat.id) ?? [] }));
  }

  /**
   * Format boats for map display with location data
   */
  static async formatForMap(boats: BoatWithTiers[]): Promise<BoatLocation[]> {
    if (boats.length === 0) return [];

    try {
      const rows = await db
        .select({
          id: boatsTable.id,
          name: boatsTable.name,
          category: boatsTable.category,
          imageUrl: boatsTable.mainImage,
          latitude: sql<number>`ST_Y(${boatsTable.location}::geometry)`,
          longitude: sql<number>`ST_X(${boatsTable.location}::geometry)`,
        })
        .from(boatsTable)
        .where(
          and(
            inArray(boatsTable.id, boats.map((boat) => boat.id)),
            isNotNull(boatsTable.location)
          )
        );

      const boatsById = new Map(boats.map((boat) => [boat.id, boat]));
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        category: row.category || "OTHER",
        // The first tier's price is the "from" price on the map pin.
        price: boatsById.get(row.id)?.pricingTiers[0]?.price ?? 0,
        imageUrl: row.imageUrl ?? undefined,
      }));
    } catch (error) {
      console.error("Error formatting boats for map:", error);
      return [];
    }
  }

  /**
   * Calculate pagination info
   */
  static calculatePagination(totalCount: number, limit: number): { totalPages: number } {
    return {
      totalPages: Math.ceil(totalCount / limit)
    };
  }

  /**
   * Format complete search results with all necessary data
   */
  static async formatSearchResults(
    boats: Boat[],
    totalCount: number,
    limit: number
  ): Promise<{
    boats: BoatWithTiers[];
    totalCount: number;
    totalPages: number;
    locations: BoatLocation[];
  }> {
    // Add pricing tiers to boats
    const boatsWithPricing = await this.addPricingTiers(boats);
    
    // Calculate pagination
    const { totalPages } = this.calculatePagination(totalCount, limit);
    
    // Format for map display
    const locations = await this.formatForMap(boatsWithPricing);

    return {
      boats: boatsWithPricing,
      totalCount,
      totalPages,
      locations
    };
  }

  /**
   * Format category data with counts for filter display
   */
  static formatCategories(categories: {category: string; count: number}[]): {
    category: string;
    count: number;
    displayName: string;
  }[] {
    return categories.map(cat => ({
      ...cat,
      displayName: this.getCategoryDisplayName(cat.category)
    }));
  }

  /**
   * Get user-friendly category display name
   */
  private static getCategoryDisplayName(category: string): string {
    const categoryMap: Record<string, string> = {
      'SAILBOAT': 'Sailboats',
      'MOTORBOAT': 'Motorboats', 
      'YACHT': 'Yachts',
      'CATAMARAN': 'Catamarans',
      'PONTOON': 'Pontoon Boats',
      'FISHING_BOAT': 'Fishing Boats',
      'SPEEDBOAT': 'Speedboats',
      'HOUSEBOAT': 'Houseboats',
      'JET_SKI': 'Jet Skis',
      'OTHER': 'Other'
    };
    
    return categoryMap[category] || category;
  }
} 