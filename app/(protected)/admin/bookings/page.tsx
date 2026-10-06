import { Suspense } from "react";
import { getBoatTiers } from "@/features/boats/boat.data";
import {
  getAssignableStaff,
  getDealTypeCounts,
  getDealViewer,
  listDeals,
} from "@/features/bookings/deal.data";
import { bookingSearchParamsCache } from "@/features/bookings/searchParams";
import { AdminBookingFilter } from "@/features/bookings/components/admin/AdminBookingFilter";
import { BookingsHeaderCta } from "@/features/bookings/components/admin/BookingsHeaderCta";
import { BookingTypeStrip } from "@/features/bookings/components/admin/BookingTypeStrip";
import { AdminBookingsBoard } from "@/features/bookings/components/admin/AdminBookingsBoard";
import { AdminBookingTablePagination } from "@/features/bookings/components/admin/AdminBookingTablePagination";
import { AdminBookingsCalendar } from "@/features/bookings/components/admin/AdminBookingsCalendar";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { SearchParams } from "next/dist/server/request/search-params";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await bookingSearchParamsCache.parse(searchParams);
  const params = bookingSearchParamsCache.all();

  const [admins, pricingTiers, viewer] = await Promise.all([
    getAssignableStaff(),
    getBoatTiers(),
    getDealViewer(),
  ]);

  const filter = (
    <Suspense fallback={<div className="h-10 shrink-0 animate-pulse rounded-full bg-muted pb-3" />}>
      <AdminBookingFilter admins={admins} />
    </Suspense>
  );

  // ONE way in: Add booking. Phone/DM inquiries go through the same door —
  // an inquiry is just a booking at its first stage, not a separate thing.
  const headerCta = (
    <BookingsHeaderCta pricingTiers={pricingTiers} canLinkAccounts={viewer.canLinkAccounts} />
  );

  if (params.view === "calendar") {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <BookingsPageHeader cta={headerCta} />
        <div className="flex min-h-0 flex-1 flex-col">
          <AdminListShell toolbar={filter}>
            <AdminBookingsCalendar />
          </AdminListShell>
        </div>
      </div>
    );
  }

  const nowIso = new Date().toISOString();

  // Base filters shared by the list AND the type-count strip (the strip omits
  // bookingType so every segment shows its true count while one is selected).
  const scopeFilters = {
    search: params.search || undefined,
    dateFrom: params.dateFrom ?? (params.time === "upcoming" ? nowIso : undefined),
    dateTo: params.dateTo ?? (params.time === "past" ? nowIso : undefined),
    mine: params.scope === "mine" || undefined,
    assignedAdminId: params.scope === "mine" ? undefined : (params.assignedAdminId ?? undefined),
    unassignedOnly: params.scope === "unassigned" || undefined,
    // An explicit status filter searches everything; otherwise bucket by pill.
    archivedView: params.bookingStatus ? undefined : (params.archived ?? false),
  };

  // ONE table, one query: every deal — inquiry to completed charter — is a
  // booking row. The type command strip filters by bookingType.
  const [result, typeCounts] = await Promise.all([
    listDeals({
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
    getDealTypeCounts(scopeFilters),
  ]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <BookingsPageHeader totalCount={result.totalCount} cta={headerCta} />
      <BookingTypeStrip counts={typeCounts.counts} total={typeCounts.total} />
      <div className="flex min-h-0 flex-1 flex-col">
        <AdminListShell
          toolbar={filter}
          pagination={
            <AdminBookingTablePagination
              totalCount={result.totalCount}
              totalPages={result.totalPages}
              page={result.page}
              limit={result.limit}
            />
          }
        >
          <AdminBookingsBoard bookings={result.bookings} admins={admins} />
        </AdminListShell>
      </div>
    </div>
  );
}

function BookingsPageHeader({
  totalCount,
  cta,
}: {
  totalCount?: number;
  cta?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-1">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        {totalCount != null ? (
          <p className="text-sm tabular-nums text-muted-foreground">
            {totalCount.toLocaleString()} {totalCount === 1 ? "booking" : "bookings"}
          </p>
        ) : null}
      </div>
      {cta}
    </header>
  );
}
