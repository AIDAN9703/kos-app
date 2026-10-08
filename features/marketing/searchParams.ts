import { createSearchParamsCache, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { ADMIN_LIST_DEFAULT_PAGE_SIZE } from "@/shared/admin/list-pagination";

export const CONTACT_FILTERS = ["subscribed", "unsubscribed", "pending"] as const;

/** The contacts list's URL state, shared by the page and its toolbar. */
export const contactSearchParams = {
  search: parseAsString.withDefault(""),
  /** A list (the contact's source); none = every list. */
  list: parseAsString,
  filter: parseAsStringLiteral(CONTACT_FILTERS),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(ADMIN_LIST_DEFAULT_PAGE_SIZE),
};

export const contactSearchParamsCache = createSearchParamsCache(contactSearchParams);
