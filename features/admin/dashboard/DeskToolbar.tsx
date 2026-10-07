import { NewBookingModal } from "@/features/bookings/components/admin/new-booking-modal";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";

/** The greeting, and the one thing you start from. */
export function DeskToolbar({
  firstName,
  pricingTiers,
}: {
  firstName: string | null;
  pricingTiers: PricingTierOption[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Welcome back{firstName ? `, ${firstName}` : ""} 👋
      </h1>
      <NewBookingModal
        pricingTiers={pricingTiers}
        canLinkAccounts
        triggerLabel="New booking"
        triggerClassName="h-9 rounded-full px-4 text-sm font-semibold"
      />
    </div>
  );
}
