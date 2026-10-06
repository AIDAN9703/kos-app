import { Suspense } from "react";
import type { SearchParams } from "next/dist/server/request/search-params";

import { bookingService } from "@/features/bookings/services/booking.service";
import { getBoatTiers } from "@/features/boats/boat.data";
import { bookingSearchParamsCache } from "@/features/bookings/searchParams";
import { AdminBookingFilter } from "@/features/bookings/components/admin/AdminBookingFilter";
import { BookingsHeaderCta } from "@/features/bookings/components/admin/BookingsHeaderCta";
import { BookingTypeStrip } from "@/features/bookings/components/admin/BookingTypeStrip";
import { AdminBookingsBoard } from "@/features/bookings/components/admin/AdminBookingsBoard";
import { AdminBookingTablePagination } from "@/features/bookings/components/admin/AdminBookingTablePagination";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { requireBrokerPortal } from "@/shared/lib/utils/auth-utils";

/** The broker's deals: the same board as the admin area, only rows assigned to them. */
export default async function BrokerDealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireBrokerPortal();
  await bookingSearchParamsCache.parse(searchParams);
  const params = bookingSearchParamsCache.all();
  const nowIso = new Date().toISOString();

  const scopeFilters = {
    search: params.search || undefined,
    dateFrom: params.dateFrom ?? (params.time === "upcoming" ? nowIso : undefined),
    dateTo: params.dateTo ?? (params.time === "past" ? nowIso : undefined),
    assignedAdminId: session.user.id,
    archivedView: params.bookingStatus ? undefined : (params.archived ?? false),
  };

  const [result, typeCounts, pricingTiers] = await Promise.all([
    bookingService.getAllBookings({
      ...scopeFilters,
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
    }),
    bookingService.getBookingTypeCounts(scopeFilters),
    getBoatTiers(),
  ]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-1">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">My deals</h1>
          <p className="text-sm tabular-nums text-muted-foreground">
            {result.totalCount.toLocaleString()} {result.totalCount === 1 ? "deal" : "deals"}
          </p>
        </div>
        <BookingsHeaderCta pricingTiers={pricingTiers} />
      </header>
      <BookingTypeStrip counts={typeCounts.counts} total={typeCounts.total} />
      <div className="flex min-h-0 flex-1 flex-col">
        <AdminListShell
          toolbar={
            <Suspense fallback={<div className="h-10 shrink-0 animate-pulse rounded-full bg-muted pb-3" />}>
              <AdminBookingFilter admins={[]} variant="broker" />
            </Suspense>
          }
          pagination={
            <AdminBookingTablePagination
              totalCount={result.totalCount}
              totalPages={result.totalPages}
              page={result.page}
              limit={result.limit}
            />
          }
        >
          <AdminBookingsBoard bookings={result.bookings} view="broker" />
        </AdminListShell>
      </div>
    </div>
  );
}
