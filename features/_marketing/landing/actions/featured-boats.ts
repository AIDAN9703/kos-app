import { db } from "@/database/db";
import { boats, boatPricingTiers } from "@/database/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { ActionResponse } from "@/shared/lib/types/types";
import { cachedFetch } from '@/shared/lib/utils/general-utils';
import { BoatWithTiers } from "@/features/boats/boat.types";

export async function getFeaturedBoats(): Promise<ActionResponse<BoatWithTiers[]>> {
  "use server";
  
  return cachedFetch<ActionResponse<BoatWithTiers[]>>(
    'featured-boats',
    async () => {
      try {
        console.log("Attempting to fetch featured boats...");
        
        // First, get the featured boats ordered by featuredOrder (lower = higher priority)
        const featuredBoats = await db
          .select()
          .from(boats)
          .where(eq(boats.featured, true))
          .orderBy(asc(boats.featuredOrder)); // Order by featuredOrder first, then by creation date as fallback
        
        console.log(`Successfully fetched ${featuredBoats.length} featured boats`);
        
        if (featuredBoats.length === 0) {
          return {
            success: true,
            data: []
          };
        }
        
        // Get all boat IDs for the pricing tiers query
        const boatIds = featuredBoats.map(boat => boat.id);
        
        // Get pricing tiers for all featured boats in a single query
        const pricingTiersResults = await db
          .select()
          .from(boatPricingTiers)
          .where(and(
            eq(boatPricingTiers.isActive, true),
            inArray(boatPricingTiers.boatId, boatIds)
          ));

        // Group tiers by boat ID
        const tiersByBoatId = pricingTiersResults.reduce((acc, tier) => {
          if (!acc[tier.boatId]) acc[tier.boatId] = [];
          acc[tier.boatId].push(tier);
          return acc;
        }, {} as Record<string, typeof boatPricingTiers.$inferSelect[]>);
        
        // Combine boat data with their pricing tiers
        const boatsWithPricingTiers = featuredBoats.map(boat => ({
          ...boat,
          pricingTiers: tiersByBoatId[boat.id] || []
        }));
        
        console.log(`Added pricing tiers to featured boats`);
        return {
          success: true,
          data: boatsWithPricingTiers
        };
      } catch (error) {
        console.error("Error fetching featured boats:", error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error("Error name:", error.name);
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        return {
          success: false,
          error: "Failed to fetch featured boats"
        };
      }
    },
    {
      revalidate: 3600,
      tags: ['featured-boats']
    }
  );
} 