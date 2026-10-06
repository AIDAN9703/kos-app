import "server-only";

import { cache } from "react";

import { boatService } from "@/features/boats/boat.service";
import { SearchQueryBuilder } from "@/features/search/services/query-builder";
import type { Boat } from "@/database/types";
import type { SearchParamsType, SearchResults } from "@/shared/lib/types/types";

/**
 * Search data layer: public boat search. Only active boats, as listing cards
 * and map pins; never a full boat row.
 */

export const searchBoats = cache(
  async ({
    searchParams,
    limit = 12,
    page = 1,
  }: {
    searchParams: SearchParamsType;
    limit?: number;
    page?: number;
  }): Promise<SearchResults> => {
    const query = SearchQueryBuilder.forSearch(searchParams);
    const { cards, totalCount } = await boatService.searchActiveCards({
      where: query.buildConditions(),
      orderBy: query.getOrderBy(),
      limit,
      offset: (page - 1) * limit,
    });
    return {
      boats: cards,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      locations: await boatService.getMapPins(cards),
    };
  }
);

const CATEGORY_LABELS: Record<Boat["category"], string> = {
  YACHT: "Yachts",
  SAILBOAT: "Sailboats",
  PONTOON: "Pontoon Boats",
  FISHING: "Fishing Boats",
  SPEEDBOAT: "Speedboats",
  HOUSEBOAT: "Houseboats",
  JET_SKI: "Jet Skis",
  OTHER: "Other",
};

/** Categories with active boats, for the search filters. */
export async function getSearchCategories(): Promise<
  { category: string; count: number; displayName: string }[]
> {
  const counts = await boatService.getActiveCategoryCounts();
  return counts.map((c) => ({ ...c, displayName: CATEGORY_LABELS[c.category] }));
}
