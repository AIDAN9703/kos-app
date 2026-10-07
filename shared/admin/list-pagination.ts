/** Allowed rows-per-page values for admin list tables (URL + UI selector). */
export const ADMIN_LIST_PAGE_SIZES = [10, 25, 50, 100] as const;

/** Default when `limit` is absent from the URL or service filters. */
export const ADMIN_LIST_DEFAULT_PAGE_SIZE = 25;

/** Upper bound for server queries (matches max selector value). */
const ADMIN_LIST_MAX_PAGE_SIZE = ADMIN_LIST_PAGE_SIZES.at(-1)!;

function clampAdminListLimit(limit?: number | null): number {
  const n = limit ?? ADMIN_LIST_DEFAULT_PAGE_SIZE;
  return Math.min(ADMIN_LIST_MAX_PAGE_SIZE, Math.max(1, n));
}

export function resolveAdminListPagination(filters?: {
  page?: number | null;
  limit?: number | null;
}) {
  const page = Math.max(1, filters?.page ?? 1);
  const limit = clampAdminListLimit(filters?.limit);
  return { page, limit, offset: (page - 1) * limit };
}
