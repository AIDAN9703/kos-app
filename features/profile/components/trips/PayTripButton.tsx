"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { startTripPayment } from "../../actions/trip.actions";
import { PaymentAmountChoice } from "@/features/bookings/components/PaymentAmountChoice";

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
    if (result.success && result.data) {
      window.location.href = result.data.url;
      return;
    }
    setLoading(false);
    toast({ title: "Payment unavailable", description: result.error, variant: "destructive" });
  };

  return (
    <div className="space-y-3">
      {hasDeposit ? (
        <PaymentAmountChoice
          value={chargeType}
          onChange={setChoice}
          depositCents={depositChargeCents!}
          fullCents={balanceCents}
          currency={currency}
        />
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
    </div>
  );
}
