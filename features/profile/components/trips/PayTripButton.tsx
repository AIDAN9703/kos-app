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
  /** Everything still owed, card fee included. */
  balanceCents: number;
  /** Deposit by card (deposit + its fee) — only before anything is paid. */
  depositChargeCents: number | null;
  /** Something is already paid, so this pays the remaining balance. */
  isBalance: boolean;
  currency: string;
}

/**
 * Sends the customer to Stripe Checkout for their own trip: deposit or full
 * before anything is paid, the remaining balance after. Amounts include the
 * card processing fee on that payment.
 */
export function PayTripButton({
  tripId,
  balanceCents,
  depositChargeCents,
  isBalance,
  currency,
}: PayTripButtonProps) {
  const hasDeposit = !isBalance && depositChargeCents != null && depositChargeCents < balanceCents;
  const [choice, setChoice] = useState<"deposit" | "full">("deposit");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });
  const chargeType = hasDeposit ? choice : "full";
  const chargeCents = chargeType === "deposit" ? depositChargeCents! : balanceCents;

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
            detail={`${fmt(depositChargeCents!)} now`}
            onClick={() => setChoice("deposit")}
          />
          <Choice
            active={chargeType === "full"}
            label="Pay in full"
            detail={`${fmt(balanceCents)} now`}
            onClick={() => setChoice("full")}
          />
        </div>
      ) : null}
      <Button type="button" onClick={pay} disabled={loading} className="w-full">
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {loading
          ? "Opening checkout…"
          : isBalance
            ? `Pay remaining balance · ${fmt(chargeCents)}`
            : chargeType === "deposit"
              ? `Pay ${fmt(chargeCents)} deposit`
              : `Pay ${fmt(chargeCents)}`}
      </Button>
      <p className="text-xs leading-5 text-slate-500">
        {hasDeposit && chargeType === "deposit"
          ? `Includes the card processing fee on the deposit. The remaining ${fmt(balanceCents - depositChargeCents!)} is due before the trip.`
          : "Includes the card processing fee on this payment."}
      </p>
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
