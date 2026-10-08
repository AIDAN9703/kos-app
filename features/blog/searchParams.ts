import {
  createSearchParamsCache,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { postStatusEnum } from "@/database/schema";
import { ADMIN_LIST_DEFAULT_PAGE_SIZE } from "@/shared/admin/list-pagination";

/**
 * Shared search params config for blog page.
 * Uses database enums as single source of truth.
 * Used by both Server Component (createSearchParamsCache) and Client (useQueryStates).
 */
export const blogSearchParams = {
  search: parseAsString.withDefault(""),
  status: parseAsStringEnum(postStatusEnum.enumValues),
  featured: parseAsBoolean,
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(ADMIN_LIST_DEFAULT_PAGE_SIZE),
};

export const blogSearchParamsCache = createSearchParamsCache(blogSearchParams);
