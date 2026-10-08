import {
  createSearchParamsCache,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import {
  bookingStatusEnum,
  bookingTypeEnum,
} from "@/database/schema";
import type { BookingFilterInput } from "@/features/bookings/booking.validation";
import { PAYMENT_DISPLAY_STATUSES } from "@/shared/lib/utils/payment-display";
import { ADMIN_LIST_DEFAULT_PAGE_SIZE } from "@/shared/admin/list-pagination";

/**
 * ?bookingType= accepts every raw type plus two stage-aware pseudo-values the
 * service expands over the inquiry family: "INQUIRY" (still a lead) and
 * "BOOKING" (priced past inquiry). Same rule as getDisplayKind, in SQL.
 */
const BOOKING_TYPE_FILTER_VALUES = [
  ...bookingTypeEnum.enumValues,
  "INQUIRY",
  "BOOKING",
] as const;
export type BookingTypeFilter = (typeof BOOKING_TYPE_FILTER_VALUES)[number];

/**
 * Shared search params config for bookings page.
 * Uses database enums as single source of truth (matches booking.validation).
 * Used by both Server Component (createSearchParamsCache) and Client (useQueryStates).
 */
export const bookingSearchParams = {
  search: parseAsString.withDefault(""),
  bookingStatus: parseAsStringEnum(bookingStatusEnum.enumValues),
  paymentStatus: parseAsStringEnum([...PAYMENT_DISPLAY_STATUSES]),
  bookingType: parseAsStringEnum([...BOOKING_TYPE_FILTER_VALUES]),
  dateFrom: parseAsString,
  dateTo: parseAsString,
  needsCaptain: parseAsBoolean,
  minAmount: parseAsInteger,
  maxAmount: parseAsInteger,
  assignedAdminId: parseAsString,
  bookingGroupId: parseAsString,
  /** Ownership scope: null = all, "mine" = assigned to me, "unassigned" = nobody's yet. */
  scope: parseAsStringEnum(["mine", "unassigned"] as const),
  /** Trip-date scope: null = all, "upcoming" = starts today or later, "past" = already started. */
  time: parseAsStringEnum(["upcoming", "past"] as const),
  /** Show the hidden bucket (cancelled bookings + lost/abandoned leads) instead of the live list. */
  archived: parseAsBoolean,
  /** Layout for the bookings page — "table" (default) or "calendar". */
  view: parseAsStringEnum(["table", "calendar"] as const).withDefault("table"),
  /** The calendar's month, "YYYY-MM"; absent = this month. */
  month: parseAsString,
  /** Opens the new booking modal when true (e.g. from the dashboard CTA). */
  newBooking: parseAsBoolean,
  /** Column sort — null keeps the default newest-first ordering. */
  sortBy: parseAsStringEnum(["date", "gmv"] as const),
  sortOrder: parseAsStringEnum(["asc", "desc"] as const),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(ADMIN_LIST_DEFAULT_PAGE_SIZE),
};

export const bookingSearchParamsCache =
  createSearchParamsCache(bookingSearchParams);

type BookingSearchParams = Awaited<ReturnType<typeof bookingSearchParamsCache.parse>>;

/**
 * The board's URL filters as listDeals filters (the admin board and the
 * broker portal share them). Upcoming/past are measured from `now`. An
 * explicit status filter searches every bucket; otherwise the Archived pill
 * picks the archived deals or the live ones.
 */
export function toDealListFilters(
  params: BookingSearchParams,
  now: Date
): BookingFilterInput & { mine?: boolean } {
  const nowIso = now.toISOString();
  return {
    search: params.search || undefined,
    dateFrom: params.dateFrom ?? (params.time === "upcoming" ? nowIso : undefined),
    dateTo: params.dateTo ?? (params.time === "past" ? nowIso : undefined),
    mine: params.scope === "mine" || undefined,
    assignedAdminId: params.scope === "mine" ? undefined : (params.assignedAdminId ?? undefined),
    unassignedOnly: params.scope === "unassigned" || undefined,
    archivedView: params.bookingStatus ? undefined : (params.archived ?? false),
    bookingStatus: params.bookingStatus ?? undefined,
    paymentStatus: params.paymentStatus ?? undefined,
    bookingType: params.bookingType ?? undefined,
    needsCaptain: params.needsCaptain ?? undefined,
    minAmount: params.minAmount ?? undefined,
    maxAmount: params.maxAmount ?? undefined,
    bookingGroupId: params.bookingGroupId ?? undefined,
    sortBy: params.sortBy ?? undefined,
    sortOrder: params.sortOrder ?? undefined,
    page: params.page,
    limit: params.limit,
  };
}
