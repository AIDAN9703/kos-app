"use client";

import { useQueryStates } from "nuqs";

import { bookingSearchParams } from "@/features/bookings/searchParams";
import { NewBookingModal } from "@/features/bookings/components/admin/new-booking-modal";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";

/**
 * The page header's Add booking button (like Add user). Honors the
 * ?newBooking=true deep link (the top bar's + menu) and clears it when the
 * modal closes.
 */
export function BookingsHeaderCta({
  pricingTiers,
  canLinkAccounts,
}: {
  pricingTiers: PricingTierOption[];
  canLinkAccounts: boolean;
}) {
  const [filters, setFilters] = useQueryStates(bookingSearchParams, {
    clearOnDefault: true,
    shallow: false,
  });

  return (
    <NewBookingModal
      pricingTiers={pricingTiers}
      canLinkAccounts={canLinkAccounts}
      triggerLabel="Add booking"
      triggerClassName="h-9 gap-1.5 rounded-full px-4 font-semibold"
      defaultOpen={filters.newBooking === true}
      onCloseComplete={() => {
        if (filters.newBooking) {
          setFilters({ newBooking: null });
        }
      }}
    />
  );
}
