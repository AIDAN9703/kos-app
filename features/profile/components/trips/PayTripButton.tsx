"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { startTripPayment } from "../../actions/trip.actions";

interface PayTripButtonProps {
  tripId: string;
  totalCents: number;
  /** Deposit that locks the date; null when the trip has no deposit option. */
  depositCents: number | null;
  /** Admin's default — the customer can still switch when a deposit exists. */
  paymentType: "DEPOSIT_ONLY" | "FULL_PAYMENT" | null;
  currency: string;
}

/**
 * Sends the customer to Stripe Checkout for their own trip. With a deposit on
 * offer they choose deposit-first or pay-in-full; otherwise one button.
 */
export function PayTripButton({ tripId, totalCents, depositCents, paymentType, currency }: PayTripButtonProps) {
  const hasDeposit = depositCents != null && depositCents > 0 && depositCents < totalCents;
  const [choice, setChoice] = useState<"deposit" | "full">(
    hasDeposit && paymentType === "DEPOSIT_ONLY" ? "deposit" : "full"
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });
  const chargeType = hasDeposit ? choice : "full";
  const chargeCents = chargeType === "deposit" ? depositCents! : totalCents;

  const pay = async () => {
    setLoading(true);
    const result = await startTripPayment(tripId, chargeType);
    if (result.success) {
      window.location.href = result.url;
      return;
    }
    setLoading(false);
    toast({ title: "Payment unavailable", description: result.error, variant: "destructive" });
  };

  return (
    <div className="space-y-3">
      {hasDeposit ? (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How much to pay now">
          <Choice
            active={chargeType === "deposit"}
            label="Deposit"
            detail={`${fmt(depositCents!)} now`}
            onClick={() => setChoice("deposit")}
          />
          <Choice
            active={chargeType === "full"}
            label="Pay in full"
            detail={`${fmt(totalCents)} now`}
            onClick={() => setChoice("full")}
          />
        </div>
      ) : null}
      <Button type="button" onClick={pay} disabled={loading} className="w-full">
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {loading ? "Opening checkout…" : chargeType === "deposit" ? `Pay ${fmt(chargeCents)} deposit` : `Pay ${fmt(chargeCents)}`}
      </Button>
      {hasDeposit && chargeType === "deposit" ? (
        <p className="text-xs leading-5 text-slate-500">
          The remaining {fmt(totalCents - depositCents!)} is due before the trip.
        </p>
      ) : null}
    </div>
  );
}

function Choice({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "border-2 border-primary bg-primary/5" : "border border-gray-200 hover:bg-muted/50"
      )}
    >
      <span className="block text-sm font-semibold text-primary">{label}</span>
      <span className="block text-xs text-slate-500">{detail}</span>
    </button>
  );
}
