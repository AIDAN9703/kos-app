"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCurrency } from "@/shared/lib/utils/general-utils";
import { centsToDollars, dollarsToCents, formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import type { BookingAddOn, BookingAddOnInput } from "@/features/bookings/booking.types";
import type { CustomerMoney } from "@/features/bookings/lib/booking-money";
import { updateBookingPricing } from "@/features/bookings/actions/booking-pricing.actions";
import { AddOnsFields } from "@/features/bookings/components/admin/booking-forms/shared/AddOnsFields";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";
import { useBookingEditMode } from "./BookingEditMode";

export interface FinancesLines {
  boatName: string | null;
  basePriceCents: number;
  captainFeeCents: number;
  cleaningFeeCents: number;
  addOns: BookingAddOn[];
}

export type PaymentTerms = "DEPOSIT_ONLY" | "FULL_PAYMENT";

interface FinancesBreakdownProps {
  bookingId: string;
  /** Priced and not settled — the page's Edit trip flips this into a form. */
  editable: boolean;
  currency: string;
  money: CustomerMoney;
  lines: FinancesLines;
  pricingTierId: string | null;
  /** This boat's tiers — a preset for the base price, like the composer. */
  pricingTiers: PricingTierOption[];
  paymentType: PaymentTerms | null;
}

const CUSTOM = "__custom__";

/** "1250" / "$1,250.50" → cents; empty → 0. */
function parseDollars(raw: string): number {
  const t = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? dollarsToCents(n) : NaN;
}

function toInput(cents: number | null | undefined): string {
  return cents ? String(centsToDollars(cents)) : "";
}

/**
 * The customer's price, read or edited in place. Read mode is the breakdown
 * the resend dialog and proposal page show. In the page's edit mode it becomes
 * the composer's pricing fields — tier or custom base, captain, cleaning,
 * add-ons, deposit — with the card fee and total recomputed live from the
 * booking's own fee rate. Saves through the page-level "Done" like the trip.
 */
export function FinancesBreakdown({
  bookingId,
  editable,
  currency,
  money,
  lines,
  pricingTierId,
  pricingTiers,
  paymentType,
}: FinancesBreakdownProps) {
  const { editing, registerSaver } = useBookingEditMode();
  const router = useRouter();
  const { toast } = useToast();
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });

  const [tierId, setTierId] = useState(pricingTierId ?? CUSTOM);
  const [base, setBase] = useState(toInput(lines.basePriceCents));
  const [captain, setCaptain] = useState(toInput(lines.captainFeeCents));
  const [cleaning, setCleaning] = useState(toInput(lines.cleaningFeeCents));
  const [deposit, setDeposit] = useState(toInput(money.depositCents));
  const [addOns, setAddOns] = useState<BookingAddOnInput[]>(() =>
    lines.addOns.map((a) => ({ name: a.name, description: a.description ?? "", unitPrice: a.unitPrice, quantity: a.quantity }))
  );

  // Re-seed from the booking each time edit mode opens.
  const [wasEditing, setWasEditing] = useState(editing);
  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) {
      setTierId(pricingTierId ?? CUSTOM);
      setBase(toInput(lines.basePriceCents));
      setCaptain(toInput(lines.captainFeeCents));
      setCleaning(toInput(lines.cleaningFeeCents));
      setDeposit(toInput(money.depositCents));
      setAddOns(lines.addOns.map((a) => ({ name: a.name, description: a.description ?? "", unitPrice: a.unitPrice, quantity: a.quantity })));
    }
  }

  const saveRef = useRef<() => Promise<{ ok: boolean; changed: boolean }>>(async () => ({ ok: true, changed: false }));
  useEffect(() => {
    if (!editing || !editable) return;
    return registerSaver("pricing", () => saveRef.current());
  }, [editing, editable, registerSaver]);

  // The rate this booking was priced with — same derivation the server uses.
  const feeRate = money.subtotalCents > 0 ? money.serviceFeeCents / money.subtotalCents : 0.035;
  const draft = {
    baseCents: parseDollars(base),
    captainCents: parseDollars(captain),
    cleaningCents: parseDollars(cleaning),
    depositCents: deposit.trim() === "" ? null : parseDollars(deposit),
    addOnsCents: Math.round(addOns.reduce((s, a) => s + a.unitPrice * a.quantity, 0) * 100),
  };
  const draftValid = [draft.baseCents, draft.captainCents, draft.cleaningCents, draft.depositCents ?? 0].every(Number.isFinite);
  const draftSubtotal = draft.baseCents + draft.captainCents + draft.cleaningCents + draft.addOnsCents;
  const draftFee = Math.round(draftSubtotal * feeRate);
  const draftTotal = money.serviceFeeWaived ? draftSubtotal : draftSubtotal + draftFee;

  async function handleSave(): Promise<{ ok: boolean; changed: boolean }> {
    if (!draftValid) {
      toast({ title: "Check the pricing amounts", description: "One of the dollar fields isn't a number.", variant: "destructive" });
      return { ok: false, changed: false };
    }
    const unchanged =
      (tierId === CUSTOM ? null : tierId) === pricingTierId &&
      draft.baseCents === lines.basePriceCents &&
      draft.captainCents === lines.captainFeeCents &&
      draft.cleaningCents === lines.cleaningFeeCents &&
      (draft.depositCents ?? 0) === (money.depositCents ?? 0) &&
      JSON.stringify(addOns.map((a) => [a.name.trim(), a.unitPrice, a.quantity])) ===
        JSON.stringify(lines.addOns.map((a) => [a.name.trim(), a.unitPrice, a.quantity]));
    if (unchanged) return { ok: true, changed: false };

    const res = await updateBookingPricing(bookingId, {
      pricingTierId: tierId === CUSTOM ? null : tierId,
      basePriceCents: draft.baseCents,
      captainFeeCents: draft.captainCents,
      cleaningFeeCents: draft.cleaningCents,
      depositAmountCents: draft.depositCents && draft.depositCents > 0 ? draft.depositCents : null,
      addOns: addOns
        .filter((a) => a.name.trim())
        .map((a) => ({ name: a.name.trim(), description: a.description?.trim() || null, unitPrice: a.unitPrice, quantity: a.quantity })),
    });
    if (!res.success) {
      toast({ title: "Couldn't save pricing", description: res.error, variant: "destructive" });
      return { ok: false, changed: true };
    }
    toast({ title: "Pricing saved" });
    router.refresh();
    return { ok: true, changed: true };
  }
  useEffect(() => {
    saveRef.current = handleSave;
  });

  if (editing && editable) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {pricingTiers.length > 0 ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Pricing tier</Label>
              <Select
                value={tierId}
                onValueChange={(v) => {
                  setTierId(v);
                  const tier = pricingTiers.find((t) => t.id === v);
                  if (tier) setBase(String(tier.price));
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="admin-theme">
                  <SelectItem value={CUSTOM}>Custom price</SelectItem>
                  {pricingTiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name || `${t.hours} hrs`} · {formatCurrency(t.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DollarField label="Charter price" value={base} onChange={(v) => { setBase(v); setTierId(CUSTOM); }} />
          <DollarField label="Captain fee" value={captain} onChange={setCaptain} />
          <DollarField label="Cleaning fee" value={cleaning} onChange={setCleaning} />
          <DollarField label="Deposit" value={deposit} onChange={setDeposit} hint="Blank = no deposit option" />
        </div>

        <AddOnsFields lineItems={addOns} onChange={setAddOns} />

        <dl className="space-y-1.5 rounded-xl bg-secondary/40 p-3 text-sm">
          <Row label="Subtotal" value={draftValid ? fmt(draftSubtotal) : "—"} />
          <Row
            label={money.serviceFeeWaived ? "Card fee · waived" : `Card fee (${(feeRate * 100).toFixed(2).replace(/\.?0+$/, "")}%)`}
            value={draftValid ? fmt(draftFee) : "—"}
            muted
            strike={money.serviceFeeWaived}
          />
          <Row label="New total" value={draftValid ? fmt(draftTotal) : "—"} strong />
          {money.paidCents > 0 ? (
            <Row label="Balance after paid" value={draftValid ? fmt(Math.max(0, draftTotal - money.paidCents)) : "—"} muted />
          ) : null}
        </dl>
        <p className="text-xs text-muted-foreground">
          Saving re-prices this booking. If the customer already has the link, you&apos;ll be asked to resend it.
        </p>
      </div>
    );
  }

  return (
    <dl className="space-y-1.5 text-sm">
      <Row label={lines.boatName ?? "Charter"} value={fmt(lines.basePriceCents)} />
      {lines.addOns.map((a, i) => (
        <Row key={i} label={`${a.name}${a.quantity > 1 ? ` × ${a.quantity}` : ""}`} value={fmt(Math.round(a.total * 100))} muted />
      ))}
      {lines.captainFeeCents > 0 ? <Row label="Captain" value={fmt(lines.captainFeeCents)} muted /> : null}
      {lines.cleaningFeeCents > 0 ? <Row label="Cleaning" value={fmt(lines.cleaningFeeCents)} muted /> : null}
      <Row
        label={money.serviceFeeWaived ? "Card fee · waived" : "Card fee"}
        value={fmt(money.serviceFeeCents)}
        muted
        strike={money.serviceFeeWaived}
      />
      <div className="my-2 border-t border-border/50" role="presentation" />
      <Row label="Total" value={fmt(money.totalCents)} strong />
      <Row label="Paid" value={fmt(money.paidCents)} tone={money.paidCents > 0 ? "success" : undefined} />
      <Row
        label={money.balanceCents > 0 ? "Balance due" : "Balance"}
        value={money.balanceCents > 0 ? fmt(money.balanceCents) : "Settled"}
        tone={money.balanceCents > 0 ? "warning" : "success"}
        strong
      />
      <div className="my-2 border-t border-border/50" role="presentation" />
      <Row
        label="Payment terms"
        value={
          paymentType === "DEPOSIT_ONLY" && money.depositCents
            ? `Deposit first · ${fmt(money.depositCents)}`
            : money.depositCents
              ? `Full payment · ${fmt(money.depositCents)} deposit available`
              : "Full payment"
        }
        muted
      />
    </dl>
  );
}

function DollarField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">$</span>
        <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0.00" className="h-10 pl-7" />
      </div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
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
