import type { SearchParams } from "nuqs/server";
import { getBoatTiers } from "@/features/boats/boat.data";
import { getAssignableStaff, getDealViewer, listCalendarDeals, listDeals } from "@/features/bookings/deal.data";
import { gridQueryRange, monthGridDays, resolveMonth } from "@/features/bookings/lib/calendar-month";
import { bookingSearchParamsCache, toDealListFilters } from "@/features/bookings/searchParams";
import { AdminBookingFilter } from "@/features/bookings/components/admin/AdminBookingFilter";
import { BookingsHeaderCta } from "@/features/bookings/components/admin/BookingsHeaderCta";
import { AdminBookingsBoard } from "@/features/bookings/components/admin/AdminBookingsBoard";
import { AdminBookingTablePagination } from "@/features/bookings/components/admin/AdminBookingTablePagination";
import { BookingsCalendar } from "@/features/bookings/components/admin/BookingsCalendar";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";

/**
 * Every deal, inquiry to completed charter, as one table (or the calendar).
 * One way in: Add booking. Phone and DM inquiries go through the same door;
 * an inquiry is just a booking at its first stage.
 */
export default async function BookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await bookingSearchParamsCache.parse(searchParams);
  const now = new Date();
  const filters = toDealListFilters(params, now);
  // The calendar loads the month on screen; the table, one page.
  const month = params.view === "calendar" ? resolveMonth(params.month, now) : null;
  const range = month ? gridQueryRange(monthGridDays(month)) : null;

  const [admins, pricingTiers, viewer, result, calendarDeals] = await Promise.all([
    getAssignableStaff(),
    getBoatTiers(),
    getDealViewer(),
    month ? null : listDeals(filters),
    range ? listCalendarDeals(filters, range.from, range.to) : null,
  ]);

  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader
              title="Bookings"
              actions={<BookingsHeaderCta pricingTiers={pricingTiers} canLinkAccounts={viewer.canLinkAccounts} />}
            />
            <AdminBookingFilter admins={admins} />
          </>
        }
        pagination={
          result ? (
            <AdminBookingTablePagination
              totalCount={result.totalCount}
              totalPages={result.totalPages}
              page={result.page}
              limit={result.limit}
            />
          ) : undefined
        }
      >
        {month && calendarDeals ? (
          <BookingsCalendar month={month} deals={calendarDeals} />
        ) : result ? (
          <AdminBookingsBoard bookings={result.bookings} admins={admins} />
        ) : null}
      </AdminListShell>
    </GlassPage>
  );
}
