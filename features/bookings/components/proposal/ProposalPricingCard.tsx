"use client";

import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";
import type {
  ProposalBooking,
  ProposalPaymentOptions,
} from "@/features/bookings/lib/proposal.types";

interface ProposalPricingCardProps {
  bookings: ProposalBooking[];
  payment: ProposalPaymentOptions;
  totalPaidCents?: number;
}

export function ProposalPricingCard({
  bookings,
  payment,
  totalPaidCents = 0,
}: ProposalPricingCardProps) {
  const subtotalCents = bookings.reduce((sum, b) => sum + b.totalCents - b.serviceFeeCents, 0);
  const totalServiceFeeCents = bookings.reduce((sum, b) => sum + b.serviceFeeCents, 0);
  // Waived = settled off-card; the fee stays visible (struck) so the math is
  // transparent, and the total drops to the subtotal.
  const feeWaived = bookings.length > 0 && bookings.every((b) => b.serviceFeeWaived);
  const grandTotalCents = feeWaived ? subtotalCents : subtotalCents + totalServiceFeeCents;
  // Derived from this proposal's own pricing snapshot — stays correct even if
  // the global fee setting changes after the proposal was created.
  const feePercentLabel =
    subtotalCents > 0
      ? ` (${String(Number(((totalServiceFeeCents / subtotalCents) * 100).toFixed(2)))}%)`
      : "";

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        return (
          <div key={booking.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{booking.boatName}</span>
              <span className="font-medium text-primary">
                {formatCentsAsCurrency(booking.basePriceCents)}
              </span>
            </div>
            {booking.captainFeeCents > 0 && (
              <div className="flex justify-between pl-3 text-sm text-slate-500">
                <span>Captain</span>
                <span>{formatCentsAsCurrency(booking.captainFeeCents)}</span>
              </div>
            )}
            {booking.cleaningFeeCents > 0 && (
              <div className="flex justify-between pl-3 text-sm text-slate-500">
                <span>Cleaning fee</span>
                <span>{formatCentsAsCurrency(booking.cleaningFeeCents)}</span>
              </div>
            )}
            {(booking.addOns ?? []).map((addOn, i) => (
              <div key={i} className="flex justify-between pl-3 text-sm text-slate-500">
                <span>
                  {addOn.name}
                  {addOn.quantity > 1 ? ` × ${addOn.quantity}` : ""}
                </span>
                <span>{formatCentsAsCurrency(dollarsToCents(addOn.total))}</span>
              </div>
            ))}
          </div>
        );
      })}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-primary">{formatCentsAsCurrency(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">
            Card processing fee{feePercentLabel}
            {feeWaived ? (
              <span className="ml-2 text-xs font-medium text-emerald-700">
                waived · paid off-card
              </span>
            ) : null}
          </span>
          <span className={feeWaived ? "text-slate-400 line-through" : "font-medium text-primary"}>
            {formatCentsAsCurrency(totalServiceFeeCents)}
          </span>
        </div>
        <div className="flex items-baseline justify-between pt-2">
          <span className="text-sm font-semibold text-primary">Total</span>
          <span className="text-lg font-bold text-primary">
            {formatCentsAsCurrency(grandTotalCents)}
          </span>
        </div>
        {totalPaidCents > 0 ? (
          <div className="space-y-1 border-t border-border/60 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Paid</span>
              <span className="font-medium text-emerald-700">
                {formatCentsAsCurrency(totalPaidCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Remaining</span>
              <span className="font-semibold text-primary">
                {formatCentsAsCurrency(payment.remainingCents)}
              </span>
            </div>
          </div>
        ) : payment.deposit ? (
          <div className="mt-2 rounded-xl bg-gold-soft/60 px-3 py-2 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-700">Deposit to secure your date</span>
              <span className="font-semibold text-primary">
                {formatCentsAsCurrency(payment.deposit.amountCents)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatCentsAsCurrency(payment.deposit.baseCents)} deposit +{" "}
              {formatCentsAsCurrency(payment.deposit.feeCents)} card processing fee. The remaining{" "}
              {formatCentsAsCurrency(Math.max(0, grandTotalCents - payment.deposit.amountCents))} is
              due before the trip, or pay in full today.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
