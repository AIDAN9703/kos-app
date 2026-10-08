import type { SearchParams } from "nuqs/server";

import { getBoatTiers } from "@/features/boats/boat.data";
import { getDealViewer, listDeals } from "@/features/bookings/deal.data";
import { bookingSearchParamsCache, toDealListFilters } from "@/features/bookings/searchParams";
import { AdminBookingFilter } from "@/features/bookings/components/admin/AdminBookingFilter";
import { BookingsHeaderCta } from "@/features/bookings/components/admin/BookingsHeaderCta";
import { AdminBookingsBoard } from "@/features/bookings/components/admin/AdminBookingsBoard";
import { AdminBookingTablePagination } from "@/features/bookings/components/admin/AdminBookingTablePagination";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";

/**
 * The broker's deals: the same board as the admin area. The data layer only
 * returns the deals assigned to them, without the company's economics.
 */
export default async function BrokerDealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await bookingSearchParamsCache.parse(searchParams);

  const [result, pricingTiers, viewer] = await Promise.all([
    listDeals(toDealListFilters(params, new Date())),
    getBoatTiers(),
    getDealViewer(),
  ]);

  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader
              title="My deals"
              actions={<BookingsHeaderCta pricingTiers={pricingTiers} canLinkAccounts={viewer.canLinkAccounts} />}
            />
            <AdminBookingFilter admins={[]} variant="broker" />
          </>
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
    </GlassPage>
  );
}
