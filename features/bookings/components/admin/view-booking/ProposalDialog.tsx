"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { centsToDollars, dollarsToCents, formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import type { CustomerMoney } from "@/features/bookings/lib/booking-money";
import type { BookingAddOn } from "@/features/bookings/booking.types";
import {
  sendProposalUpdate,
  setProposalAllowPayment,
  shareProposalLink,
} from "@/features/bookings/actions/deal.actions";
import { setBookingDeposit } from "@/features/bookings/actions/booking-pricing.actions";

export interface ProposalDialogData {
  bookingId: string;
  publicToken: string;
  /** "proposal" while PROPOSED; "payment" once booked with money owed. */
  stage: "proposal" | "payment";
  customerEmail: string | null;
  customerPhone: string | null;
  /** Admin edits since the customer last got the link. */
  editsSinceSend: number;
  allowPayment: boolean;
  currency: string;
  money: CustomerMoney;
  lines: {
    boatName: string | null;
    basePriceCents: number;
    captainFeeCents: number;
    cleaningFeeCents: number;
    addOns: BookingAddOn[];
  };
}

/**
 * The proposal moment, on demand: the exact price breakdown the customer
 * sees, the online-payment switch, and the send controls. Opens after an
 * edit session with real changes ("Notify customer of changes") and from
 * the Resend button (plain resend). One deal = one link either way.
 */
export function ProposalDialog({
  data,
  reason,
  open,
  onOpenChange,
}: {
  data: ProposalDialogData;
  /** "edited" = opened after a real change; "resend" = plain re-share. */
  reason: "edited" | "resend";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    bookingId,
    publicToken,
    stage,
    customerEmail,
    customerPhone,
    editsSinceSend,
    allowPayment,
    currency,
    money,
    lines,
  } = data;
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState(Boolean(customerEmail));
  const [sms, setSms] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pay, setPay] = useState(allowPayment);
  const [depositInput, setDepositInput] = useState(money.depositCents ? String(centsToDollars(money.depositCents)) : "");
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [, startTransition] = useTransition();
  // A deposit only matters while nothing has been paid — after that the
  // remainder is collected off this link.
  const depositApplies = pay && money.paidCents === 0 && !money.serviceFeeWaived;
  const depositDraftCents = dollarsToCents(Number(depositInput.replace(/[$,]/g, "")) || 0);
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });

  async function handleSend() {
    setSending(true);
    try {
      const r = await sendProposalUpdate(bookingId, { email, sms });
      toast(r.success ? { title: "Sent", description: r.message } : { title: "Not sent", description: r.error, variant: "destructive" });
      if (r.success) {
        onOpenChange(false);
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}/bookings/proposal/${publicToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    void shareProposalLink(bookingId);
  }

  function togglePay(next: boolean) {
    setPay(next);
    startTransition(async () => {
      const r = await setProposalAllowPayment(bookingId, next);
      if (!r.success) {
        setPay(!next);
        toast({ title: "Couldn't update", description: r.error, variant: "destructive" });
      } else {
        router.refresh();
      }
    });
  }


  async function saveDeposit() {
    if (depositDraftCents === (money.depositCents ?? 0)) return;
    setSavingDeposit(true);
    const r = await setBookingDeposit(bookingId, depositDraftCents > 0 ? depositDraftCents : null);
    setSavingDeposit(false);
    if (!r.success) {
      setDepositInput(money.depositCents ? String(centsToDollars(money.depositCents)) : "");
      toast({ title: "Couldn't update the deposit", description: r.error, variant: "destructive" });
      return;
    }
    toast({ title: depositDraftCents > 0 ? "Deposit option set" : "Deposit removed" });
    router.refresh();
  }

  const title =
    reason === "edited"
      ? "Notify customer of changes"
      : stage === "proposal"
        ? "Resend the proposal"
        : "Resend the payment link";
  const description =
    reason === "edited"
      ? "The customer keeps one link — it now shows the details below."
      : "Same link, always current. Here's exactly what the customer will see.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            {title}
            {editsSinceSend > 0 ? (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                {editsSinceSend} {editsSinceSend === 1 ? "edit" : "edits"} since last send
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

      {/* The customer's math — identical to the proposal page */}
      <dl className="space-y-1.5 text-sm">
        <Row label={lines.boatName ?? "Charter"} value={fmt(lines.basePriceCents)} />
        {lines.addOns.map((a, i) => (
          <Row key={i} label={`${a.name}${a.quantity > 1 ? ` × ${a.quantity}` : ""}`} value={fmt(Math.round(a.total * 100))} muted />
        ))}
        {lines.captainFeeCents > 0 ? <Row label="Captain" value={fmt(lines.captainFeeCents)} muted /> : null}
        {lines.cleaningFeeCents > 0 ? <Row label="Cleaning" value={fmt(lines.cleaningFeeCents)} muted /> : null}
        <div className="my-2 border-t border-border/50" />
        <Row label="Subtotal" value={fmt(money.subtotalCents)} />
        <Row
          label={money.serviceFeeWaived ? "Card fee · waived" : "Card fee"}
          value={fmt(money.serviceFeeCents)}
          muted
          strike={money.serviceFeeWaived}
        />
        <Row label="Total" value={fmt(money.totalCents)} strong />
        <div className="my-2 border-t border-border/50" />
        <Row label="Paid" value={fmt(money.paidCents)} tone={money.paidCents > 0 ? "success" : undefined} />
        <Row label="Balance" value={fmt(money.balanceCents)} tone={money.balanceCents > 0 ? "warning" : "success"} strong />
        {money.depositCents ? <Row label="Deposit to secure" value={fmt(money.depositCents)} muted /> : null}
      </dl>

      {/* Controls */}
      <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">Online payment</span>
            <span className="block text-xs text-muted-foreground">
              {pay ? "Customer can pay by card from the link" : "Customer accepts; you collect payment"}
            </span>
          </span>
          <Switch checked={pay} onCheckedChange={togglePay} disabled={money.serviceFeeWaived} />
        </label>

        {depositApplies ? (
          <div className="space-y-2 rounded-xl bg-secondary/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="font-medium">Deposit option</span>
                <span className="block text-xs text-muted-foreground">
                  {depositDraftCents > 0
                    ? `Guest can pay ${fmt(depositDraftCents)} now or the full ${fmt(money.totalCents)}`
                    : "Blank = the link only offers the full amount"}
                </span>
              </span>
              <div className="relative w-32 shrink-0">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs text-muted-foreground">$</span>
                <Input
                  inputMode="decimal"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  onBlur={() => void saveDeposit()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  disabled={savingDeposit}
                  placeholder="0.00"
                  className="h-8 pl-6 text-sm"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className={cn("flex items-center gap-2", !customerEmail && "opacity-40")}>
            <Checkbox checked={email} onCheckedChange={(v) => setEmail(v === true)} disabled={!customerEmail} />
            Email
          </label>
          <label className={cn("flex items-center gap-2", !customerPhone && "opacity-40")}>
            <Checkbox checked={sms} onCheckedChange={(v) => setSms(v === true)} disabled={!customerPhone} />
            Text
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="flex-1 gap-1.5 rounded-full"
            onClick={handleSend}
            disabled={sending || (!email && !sms)}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {stage === "proposal" ? (editsSinceSend > 0 ? "Send update" : "Send proposal") : "Send payment link"}
          </Button>
          <Button type="button" variant="ghost" className="gap-1.5 rounded-full text-muted-foreground" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
  strike,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  strike?: boolean;
  tone?: "success" | "warning";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn("truncate", muted ? "text-muted-foreground" : "text-foreground", strong && "font-semibold")}>{label}</dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          muted && !tone && "text-muted-foreground",
          strong && "font-semibold",
          strike && "line-through opacity-60",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
