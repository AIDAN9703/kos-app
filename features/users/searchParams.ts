import {
  createSearchParamsCache,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";
import { ADMIN_LIST_DEFAULT_PAGE_SIZE } from "@/shared/admin/list-pagination";

/**
 * Shared search params config for users page.
 * Used by both Server Component (createSearchParamsCache) and Client (useQueryStates).
 * Single source of truth - no duplication between page and filters.
 */
export const userSearchParams = {
  search: parseAsString.withDefault(""),
  isAdmin: parseAsBoolean,
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(ADMIN_LIST_DEFAULT_PAGE_SIZE),
};

export const userSearchParamsCache = createSearchParamsCache(userSearchParams);
