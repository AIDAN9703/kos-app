"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { recordBookingManualPaymentAction } from "@/features/bookings/actions/deal.actions";
import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_METHOD_LABELS,
  type ManualPaymentMethod,
} from "@/features/bookings/lib/manual-payment";
import type { CustomerMoney } from "@/features/bookings/lib/booking-money";
import { centsToDollars, dollarsToCents, formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";

function parseDollarsInput(raw: string): number | null {
  const t = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Record money that arrived off-card. Picking a method; for anything that
 * isn't a card the card fee is waived by default — the customer never owed it.
 * The remaining balance previews live so the admin sees what "paid in full"
 * will mean before saving.
 */
export function AdminBookingMakePaymentButton({
  bookingId,
  money,
}: {
  bookingId: string;
  money: CustomerMoney;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [method, setMethod] = useState<ManualPaymentMethod>("ZELLE");
  const [waive, setWaive] = useState(!money.serviceFeeWaived);

  // Remaining balance if this payment's fee choice is applied.
  const targetCents = money.serviceFeeWaived || waive ? money.subtotalCents : money.subtotalCents + money.serviceFeeCents;
  const remainingCents = Math.max(0, targetCents - money.paidCents);

  useEffect(() => {
    if (!open) setAmountInput("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseDollarsInput(amountInput);
    const cents = dollars == null ? 0 : dollarsToCents(dollars);
    if (cents <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive dollar amount.", variant: "destructive" });
      return;
    }
    if (cents > remainingCents) {
      toast({ title: "Too much", description: `Remaining balance is ${formatCentsAsCurrency(remainingCents)}.`, variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      const res = await recordBookingManualPaymentAction(bookingId, {
        amountCents: cents,
        method,
        waiveServiceFee: waive && !money.serviceFeeWaived,
      });
      if (res.success) {
        setOpen(false);
        router.refresh();
      } else {
        toast({ title: "Could not record payment", description: res.error, variant: "destructive" });
      }
    } finally {
      setPending(false);
    }
  }

  const disabled = money.totalCents <= 0 || money.balanceCents <= 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 rounded-full border-0 bg-success px-3.5 font-semibold text-success-foreground hover:bg-success/85"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Record payment
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              Off-card money — Zelle, wire, cash, check. Card payments come in through the proposal link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as ManualPaymentMethod)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MANUAL_PAYMENT_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="flex gap-2">
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-lg"
                    onClick={() => setAmountInput(String(centsToDollars(remainingCents)))}
                    disabled={remainingCents <= 0}
                  >
                    Full
                  </Button>
                </div>
              </div>
            </div>

            {!money.serviceFeeWaived ? (
              <label className="flex items-start gap-2.5 rounded-xl bg-secondary/40 p-3 text-sm">
                <Checkbox checked={waive} onCheckedChange={(v) => setWaive(v === true)} className="mt-0.5" />
                <span>
                  <span className="font-medium">Waive the card fee ({formatCentsAsCurrency(money.serviceFeeCents)})</span>
                  <span className="block text-xs text-muted-foreground">
                    The fee only exists for card payments. Waiving drops the total to {formatCentsAsCurrency(money.subtotalCents)}.
                  </span>
                </span>
              </label>
            ) : (
              <p className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
                Card fee already waived on this booking.
              </p>
            )}

            <div className="flex items-baseline justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Remaining after this</span>
              <span className="font-semibold tabular-nums">
                {formatCentsAsCurrency(Math.max(0, remainingCents - (dollarsToCents(parseDollarsInput(amountInput) ?? 0))))}
              </span>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full px-5" disabled={pending || remainingCents <= 0}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
