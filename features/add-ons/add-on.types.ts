import type { addOns, addOnCategoryEnum } from "@/database/schema";

export type AddOnCategory = (typeof addOnCategoryEnum.enumValues)[number];
export type AddOn = typeof addOns.$inferSelect;

/** Catalog row as shown in the admin list. */
export interface AddOnListItem {
  id: string;
  name: string;
  description: string | null;
  category: AddOnCategory;
  defaultPriceCents: number | null;
  isActive: boolean;
  sortOrder: number;
  imageUrl: string | null;
}

/**
 * A boat's offered add-on, joined with its catalog entry. Used by the per-boat
 * editor and the customer checkout. `priceCents` is the effective price
 * (per-boat override ?? catalog default ?? 0); `isComplimentary` wins over price.
 */
export interface ResolvedBoatAddOn {
  /** boat_add_on row id */
  id: string;
  /** catalog add_on id */
  addOnId: string;
  name: string;
  description: string | null;
  category: AddOnCategory;
  /** per-boat override; null = inherit catalog default */
  overridePriceCents: number | null;
  /** catalog suggested price */
  defaultPriceCents: number | null;
  /** effective charge per unit (0 when complimentary) */
  priceCents: number;
  isComplimentary: boolean;
  isActive: boolean;
  sortOrder: number;
  imageUrl: string | null;
}

export interface PaginatedAddOnsResponse {
  addOns: AddOnListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
