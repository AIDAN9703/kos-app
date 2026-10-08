import { redirect } from "next/navigation";

import { BookingComposer } from "@/features/bookings/components/admin/booking-forms/BookingComposer";
import { getBoatTiers } from "@/features/boats/boat.data";
import { getDealViewer, getInquiryForProposal } from "@/features/bookings/deal.data";
import { buildDatePrefillForBookingForm } from "@/features/bookings/lib/booking-create-date-prefill";
import { BackButton } from "@/shared/admin/components/BackButton";

type Props = {
  /** `dealId` prices an INQUIRY deal into a proposal (upgrades that row). */
  searchParams: Promise<{ dealId?: string; date?: string }>;
};

export default async function AdminBookingCreatePage({ searchParams }: Props) {
  const { dealId, date } = await searchParams;
  const targetDealId = dealId?.trim();

  const [pricingTiers, deal, viewer] = await Promise.all([
    getBoatTiers(),
    targetDealId ? getInquiryForProposal(targetDealId) : Promise.resolve(null),
    getDealViewer(),
  ]);

  // Only INQUIRY-status deals get priced through this form. A deal that's
  // already past inquiry has its own trip/pricing — send the admin there
  // instead of silently showing a blank form that would fork a new booking.
  if (deal && deal.bookingStatus !== "INQUIRY") {
    redirect(`/admin/bookings/${deal.id}`);
  }
  const dealPrefill = deal?.prefill ?? null;
  const datePrefill =
    !dealPrefill && date?.trim() ? buildDatePrefillForBookingForm(date.trim()) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-5 pb-8">
      <header className="flex items-center gap-4 pt-1">
        <BackButton href="/admin/bookings" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {dealPrefill ? `New proposal for ${dealPrefill.customerName}` : "New booking"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dealPrefill
              ? "Price the trip and send it — the customer accepts and pays from their link."
              : "Build the trip and send the proposal, or save it and send later."}
          </p>
        </div>
      </header>
      {/* One composer for every mode — deal upgrade, calendar-date scratch,
          plain scratch. Add a second boat to create a charter party. */}
      <BookingComposer
        pricingTiers={pricingTiers}
        canLinkAccounts={viewer.canLinkAccounts}
        dealPrefill={dealPrefill}
        datePrefill={datePrefill}
      />
    </div>
  );
}
