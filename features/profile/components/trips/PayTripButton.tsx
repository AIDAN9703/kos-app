"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { startTripPayment } from "../../actions/trip.actions";

/** Sends the customer to Stripe Checkout for their own trip. */
export function PayTripButton({ tripId, label }: { tripId: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const pay = async () => {
    setLoading(true);
    const result = await startTripPayment(tripId);
    if (result.success) {
      window.location.href = result.url;
      return;
    }
    setLoading(false);
    toast({ title: "Payment unavailable", description: result.error, variant: "destructive" });
  };

  return (
    <Button type="button" onClick={pay} disabled={loading} className="w-full sm:w-auto">
      {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
      {loading ? "Opening checkout…" : label}
    </Button>
  );
}
