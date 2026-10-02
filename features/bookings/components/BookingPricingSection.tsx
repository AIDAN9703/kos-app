"use client";

import { Zap } from "lucide-react";

import { formatCurrency } from "@/shared/lib/utils/general-utils";
import { SafeBoatData, PricingTier } from "@/features/bookings/booking.types";
import {
  calculateBookingPriceCents,
  formatServiceFee,
  type ServiceFee,
} from "@/shared/lib/utils/pricing-utils";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";

export interface PricingSectionAddOn {
  name: string;
  quantity: number;
  /** Line total in dollars (0 when complimentary). */
  total: number;
  isComplimentary?: boolean;
}

interface BookingPricingSectionProps {
  boat: SafeBoatData;
  selectedTier: PricingTier;
  /** The card fee from app settings (rate + fixed), passed down from the server page. */
  serviceFee: ServiceFee;
  showHeading?: boolean;
  addOns?: PricingSectionAddOn[];
}

export default function BookingPricingSection({
  boat,
  selectedTier,
  serviceFee,
  showHeading = true,
  addOns = [],
}: BookingPricingSectionProps) {
  const paidAddOnsTotal = addOns
    .filter((a) => !a.isComplimentary)
    .reduce((sum, a) => sum + a.total, 0);
  // Fold paid add-ons into the fee base so the service fee + total match the server.
  const priceBreakdown = calculateBookingPriceCents(
    dollarsToCents(selectedTier.price),
    dollarsToCents(boat.cleaningFee || 0),
    0,
    dollarsToCents(paidAddOnsTotal),
    serviceFee
  );
  const currency = boat.currency ?? "USD";
  const fmt = (amount: number) => formatCurrency(amount, currency);

  const lineItems = [
    {
      label: `${selectedTier.name || "Charter"} · ${selectedTier.hours}h`,
      amount: selectedTier.price,
      included: false,
    },
    {
      label: "Captain",
      amount: 0,
      included: true,
    },
    ...((boat.cleaningFee || 0) > 0
      ? [
          {
            label: "Cleaning fee",
            amount: boat.cleaningFee || 0,
            included: false,
          },
        ]
      : []),
    ...addOns.map((a) => ({
      label: a.quantity > 1 ? `${a.name} × ${a.quantity}` : a.name,
      amount: a.total,
      included: !!a.isComplimentary,
    })),
    {
      label: `Processing (${formatServiceFee(serviceFee)})`,
      amount: priceBreakdown.serviceFeeCents / 100,
      included: false,
    },
  ];

  return (
    <div className="space-y-5">
      {showHeading && <h3 className="text-sm font-medium text-foreground">Price details</h3>}

      <ul className="space-y-3">
        {lineItems.map((item) => (
          <li key={item.label} className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
              {item.included ? (
                <span className="text-muted-foreground">Included</span>
              ) : (
                fmt(item.amount)
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between gap-4 pt-1">
        <span className="text-base font-semibold text-foreground">Total</span>
        <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {fmt(priceBreakdown.totalPriceCents / 100)}
        </span>
      </div>

      {boat.instantBook && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 shrink-0" />
          Charged immediately after you confirm
        </p>
      )}
    </div>
  );
}
