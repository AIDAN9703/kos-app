import {
  createSearchParamsCache,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { ADMIN_LIST_DEFAULT_PAGE_SIZE } from "@/shared/admin/list-pagination";
import { USER_LIST_VIEWS } from "@/features/users/user.validation";

/**
 * The people list's URL state, shared by the page (createSearchParamsCache)
 * and the toolbar (useQueryStates).
 */
export const userSearchParams = {
  search: parseAsString.withDefault(""),
  /** A role, customers, or deactivated accounts; none = everyone. */
  view: parseAsStringLiteral(USER_LIST_VIEWS),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(ADMIN_LIST_DEFAULT_PAGE_SIZE),
  /** Opens the Add user sheet (toolbar button, the header's + menu, deep links). */
  newUser: parseAsBoolean,
};

export const userSearchParamsCache = createSearchParamsCache(userSearchParams);
