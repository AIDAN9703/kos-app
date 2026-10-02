import { redirect } from "next/navigation";

import { BookingComposer } from "@/features/bookings/components/admin/booking-forms/BookingComposer";
import { boatService } from "@/features/boats/boat.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { buildDealPrefillForBookingForm } from "@/features/bookings/lib/deal-prefill";
import { buildDatePrefillForBookingForm } from "@/features/bookings/lib/booking-create-date-prefill";

type Props = {
  /** `dealId` prices an INQUIRY deal into a proposal (upgrades that row).
   *  `inquiryId` is the legacy spelling — same ids post-migration. */
  searchParams: Promise<{ dealId?: string; inquiryId?: string; date?: string }>;
};

export default async function AdminBookingCreatePage({ searchParams }: Props) {
  const { dealId, inquiryId, date } = await searchParams;
  const targetDealId = (dealId ?? inquiryId)?.trim();

  const [pricingTiers, deal] = await Promise.all([
    boatService.getAllActivePricingTiers(),
    targetDealId ? bookingService.getBookingById(targetDealId) : Promise.resolve(null),
  ]);

  // Only INQUIRY-status deals get priced through this form. A deal that's
  // already past inquiry has its own trip/pricing — send the admin there
  // instead of silently showing a blank form that would fork a new booking.
  if (deal && deal.bookingStatus !== "INQUIRY") {
    redirect(`/admin/bookings/${deal.id}`);
  }
  const dealPrefill = deal ? buildDealPrefillForBookingForm(deal) : null;
  const datePrefill =
    !dealPrefill && date?.trim() ? buildDatePrefillForBookingForm(date.trim()) : null;

  return (
    <div className="flex w-full flex-1 flex-col gap-5 pb-8">
      <header className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {dealPrefill ? `New proposal for ${dealPrefill.customerName}` : "New booking"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dealPrefill
            ? "Price the trip and send it — the customer accepts and pays from their link."
            : "Build the trip and send the proposal, or save it and send later."}
        </p>
      </header>
      {/* One composer for every mode — deal upgrade, calendar-date scratch,
          plain scratch. Add a second boat to create a charter party. */}
      <BookingComposer
        pricingTiers={pricingTiers}
        dealPrefill={dealPrefill}
        datePrefill={datePrefill}
      />
    </div>
  );
}
