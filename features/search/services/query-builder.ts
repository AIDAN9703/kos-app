import "server-only";

import { boats, boatCategoryEnum } from "@/database/schema";
import { SearchParamsType } from "@/shared/lib/types/types";
import { and, asc, desc, eq, gte, inArray, lte, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { parseArrayParam, parseNumberParam, parseStringParam } from "@/shared/lib/utils/search-params-utils";

type BoatCategory = (typeof boatCategoryEnum.enumValues)[number];
const isBoatCategory = (value: string): value is BoatCategory =>
  (boatCategoryEnum.enumValues as readonly string[]).includes(value);

/**
 * Service for building complex database queries for boat search
 */
export class SearchQueryBuilder {
  private conditions: SQL[] = [];
  private orderBy: SQL[] = [];

  constructor() {
    // Always start with active boats only
    this.conditions = [eq(boats.active, true)];
    this.orderBy = [desc(boats.featured)];
  }

  /**
   * Add exclusion filter (exclude specific boat IDs)
   */
  addExclusionFilter(searchParams: SearchParamsType): this {
    const exclude = parseStringParam(searchParams.exclude);
    if (exclude) {
      this.conditions.push(sql`${boats.id} != ${exclude}`);
    }
    return this;
  }

  /**
   * Add category filters with support for multiple categories
   */
  addCategoryFilter(searchParams: SearchParamsType): this {
    if (searchParams.category && searchParams.category !== 'all') {
      const categories = parseArrayParam(searchParams.category);
      
      if (categories.length > 0) {
        const validCategories = categories.filter(isBoatCategory);

        if (validCategories.length === 1) {
          this.conditions.push(eq(boats.category, validCategories[0]));
        } else if (validCategories.length > 1) {
          this.conditions.push(inArray(boats.category, validCategories));
        }
      }
    }
    return this;
  }

  /**
   * Add price range filters using pricing tier subqueries
   */
  addPriceFilter(searchParams: SearchParamsType): this {
    if (searchParams.minPrice || searchParams.maxPrice) {
      const minPrice = parseNumberParam(searchParams.minPrice);
      const maxPrice = parseNumberParam(searchParams.maxPrice);

      if (minPrice !== null || maxPrice !== null) {
        if (minPrice !== null) {
          this.conditions.push(sql`EXISTS (
            SELECT 1 FROM boat_pricing_tier 
            WHERE boat_pricing_tier.boat_id = ${boats.id} 
            AND boat_pricing_tier.is_active = TRUE 
            AND boat_pricing_tier.price >= ${minPrice}
          )`);
        }

        if (maxPrice !== null) {
          this.conditions.push(sql`EXISTS (
            SELECT 1 FROM boat_pricing_tier 
            WHERE boat_pricing_tier.boat_id = ${boats.id} 
            AND boat_pricing_tier.is_active = TRUE 
            AND boat_pricing_tier.price <= ${maxPrice}
          )`);
        }
      }
    }
    return this;
  }

  /**
   * Add numeric range filters for boat specifications
   */
  addSpecificationFilters(searchParams: SearchParamsType): this {
    const addNumericFilter = (param: string | string[] | undefined, field: AnyColumn, operator: typeof gte | typeof lte) => {
      const value = parseNumberParam(param);
      if (value !== null) {
        this.conditions.push(operator(field, value));
      }
    };
    
    // Apply all numeric filters
    addNumericFilter(searchParams.minLength, boats.lengthFt, gte);
    addNumericFilter(searchParams.maxLength, boats.lengthFt, lte);
    addNumericFilter(searchParams.minYear, boats.yearBuilt, gte);
    addNumericFilter(searchParams.maxYear, boats.yearBuilt, lte);
    addNumericFilter(searchParams.passengers, boats.capacity, gte);
    
    return this;
  }

  /**
   * Add location/bounding box filters for geographic search
   */
  addLocationFilter(searchParams: SearchParamsType): this {
    const ne_lat = parseNumberParam(searchParams.ne_lat);
    const ne_lng = parseNumberParam(searchParams.ne_lng);
    const sw_lat = parseNumberParam(searchParams.sw_lat);
    const sw_lng = parseNumberParam(searchParams.sw_lng);
    
    if (ne_lat !== null && ne_lng !== null && sw_lat !== null && sw_lng !== null) {
      if (ne_lat > sw_lat && ne_lng > sw_lng) {
        this.conditions.push(
          sql`ST_Intersects(
            ${boats.location},
            ST_MakeEnvelope(${sw_lng}, ${sw_lat}, ${ne_lng}, ${ne_lat}, 4326)
          )`
        );
      } else {
        console.warn("Invalid bounding box coordinates", { ne_lat, ne_lng, sw_lat, sw_lng });
      }
    }
    return this;
  }

  /**
   * Add features filter using array contains logic
   */
  addFeaturesFilter(searchParams: SearchParamsType): this {
    const featuresList = parseArrayParam(searchParams.features);
    
    if (featuresList.length > 0) {
      this.conditions.push(
        sql`${boats.features} @> ARRAY[${sql.join(featuresList.map(f => sql`${f}`), sql`, `)}]::text[]`
      );
    }
    return this;
  }

  /**
   * Add sorting logic based on search parameters
   */
  addSorting(searchParams: SearchParamsType): this {
    const sort = parseStringParam(searchParams.sort);
    
    if (sort) {
      switch (sort) {
        case 'price_asc':
          this.orderBy = [sql`(
            SELECT MIN(price) 
            FROM boat_pricing_tier 
            WHERE boat_id = ${boats.id} AND is_active = TRUE
          ) ASC NULLS LAST`];
          break;
        case 'price_desc':
          this.orderBy = [sql`(
            SELECT MIN(price) 
            FROM boat_pricing_tier 
            WHERE boat_id = ${boats.id} AND is_active = TRUE
          ) DESC NULLS LAST`];
          break;
        case 'length_asc': 
          this.orderBy = [asc(boats.lengthFt)]; 
          break;
        case 'length_desc': 
          this.orderBy = [desc(boats.lengthFt)]; 
          break;
        case 'newest': 
          this.orderBy = [desc(boats.createdAt)]; 
          break;
        default: 
          this.orderBy = [desc(boats.featured), desc(boats.createdAt)]; 
          break;
      }
    }
    return this;
  }

  /**
   * Build complete query conditions
   */
  buildConditions(): SQL | undefined {
    return this.conditions.length > 1 ? and(...this.conditions) : this.conditions[0];
  }

  /**
   * Get order by clauses
   */
  getOrderBy(): SQL[] {
    return this.orderBy;
  }

  /**
   * Build a complete query builder with all common filters applied
   */
  static forSearch(searchParams: SearchParamsType): SearchQueryBuilder {
    return new SearchQueryBuilder()
      .addExclusionFilter(searchParams)
      .addCategoryFilter(searchParams)
      .addPriceFilter(searchParams)
      .addSpecificationFilters(searchParams)
      .addLocationFilter(searchParams)
      .addFeaturesFilter(searchParams)
      .addSorting(searchParams);
  }
} 