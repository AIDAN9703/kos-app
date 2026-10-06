"use client";

import { useQueryStates } from "nuqs";

import { bookingSearchParams } from "@/features/bookings/searchParams";
import { NewBookingModal } from "@/features/bookings/components/admin/new-booking-modal";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";

/**
 * "Add booking" CTA for the page header — same slot as the inquiries page's
 * New lead button. Honors the ?newBooking=true deep link (dashboard/quick
 * actions) and clears it when the modal closes.
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
      triggerClassName="gap-1.5 rounded-full px-5 shadow-sm"
      defaultOpen={filters.newBooking === true}
      onCloseComplete={() => {
        if (filters.newBooking) {
          setFilters({ newBooking: null });
        }
      }}
    />
  );
}
