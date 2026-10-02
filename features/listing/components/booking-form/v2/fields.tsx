"use client";

import * as React from "react";
import { ChevronDown, Info, Minus, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn, formatCurrency } from "@/shared/lib/utils/general-utils";
import { PricingTier } from "@/shared/lib/types/types";
import {
  calculateBookingPriceCents,
  formatServiceFee,
  type ServiceFee,
} from "@/shared/lib/utils/pricing-utils";
import { centsToDollars, dollarsToCents, formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import type { ResolvedBoatAddOn } from "@/features/add-ons/add-on.types";
import type { BookingPickerLayout } from "../shared/booking-picker-layout";

/* -------------------------------------------------------------------------- */
/*  Disclosure row — a tappable field that reveals a panel (calendar / times)  */
/*  inline (mobile drawer) or in a popover (desktop). Used as a row inside a    */
/*  divided field group, so it carries no border of its own.                   */
/* -------------------------------------------------------------------------- */

function RowContent({
  icon,
  label,
  value,
  placeholder,
  open,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  placeholder: string;
  open?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 text-left">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
          disabled ? "bg-muted text-muted-foreground/50" : "bg-primary/[0.07] text-primary"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "truncate text-[15px] font-semibold",
            value ? "text-foreground" : "text-muted-foreground/70"
          )}
        >
          {value || placeholder}
        </div>
      </div>
      {!disabled && (
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

export function DisclosureRow({
  icon,
  label,
  value,
  placeholder,
  open,
  onOpenChange,
  disabled = false,
  layout,
  popoverClassName,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  placeholder: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  layout: BookingPickerLayout;
  popoverClassName?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <div className="opacity-60">
        <RowContent icon={icon} label={label} placeholder={placeholder} disabled />
      </div>
    );
  }

  const trigger = (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      className="block w-full transition-colors hover:bg-muted/40"
    >
      <RowContent icon={icon} label={label} value={value} placeholder={placeholder} open={open} />
    </button>
  );

  if (layout === "inline") {
    return (
      <div>
        {trigger}
        {open && <div className="px-4 pb-4">{children}</div>}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] rounded-2xl border-border p-3 shadow-xl",
          popoverClassName
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/*  Info tooltip (hover/focus)                                                 */
/* -------------------------------------------------------------------------- */

export function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[15rem] text-xs font-normal leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Price header                                                               */
/* -------------------------------------------------------------------------- */

export function PriceHeader({ tier, currency }: { tier: PricingTier | null; currency: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[2rem] font-bold leading-none tracking-tight text-foreground">
          {tier ? formatCurrency(tier.price, currency) : "—"}
        </span>
        {tier && (
          <span className="text-sm font-medium text-muted-foreground">/ {tier.hours} hr</span>
        )}
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        excl. fees
        <InfoTooltip label="About fees">
          The price shown is the base charter rate. A cleaning fee and a card processing fee are
          added at checkout — you&apos;ll see the full breakdown before paying.
        </InfoTooltip>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Duration tiers — pill selector                                             */
/* -------------------------------------------------------------------------- */

export function DurationPills({
  tiers,
  value,
  onChange,
  currency,
}: {
  tiers: PricingTier[];
  value: string;
  onChange: (id: string) => void;
  currency: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Duration
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiers.map((tier) => {
          const selected = tier.id === value;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-all",
                selected
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/[0.03]"
              )}
            >
              <span className="text-base font-bold leading-tight">{tier.hours} hr</span>
              <span
                className={cn(
                  "mt-0.5 text-xs font-medium",
                  selected ? "text-white/80" : "text-muted-foreground"
                )}
              >
                {formatCurrency(tier.price, currency)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/*  Guest stepper (inline row control)                                         */
/* -------------------------------------------------------------------------- */

function StepperButton({
  onClick,
  disabled,
  children,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.04] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function GuestStepper({
  icon,
  value,
  max,
  onChange,
}: {
  icon: React.ReactNode;
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/[0.07] text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Guests
        </div>
        <div className="text-[15px] font-semibold text-foreground">
          {value} {value === 1 ? "guest" : "guests"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StepperButton
          label="Remove guest"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
        >
          <Minus className="size-4" />
        </StepperButton>
        <span className="w-5 text-center text-base font-semibold tabular-nums text-foreground">
          {value}
        </span>
        <StepperButton
          label="Add guest"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Plus className="size-4" />
        </StepperButton>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Captain toggle (segmented)                                                 */
/* -------------------------------------------------------------------------- */

export function CaptainToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const options = [
    { v: false, label: "Self-drive" },
    { v: true, label: "With captain" },
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Crew
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const selected = value === opt.v;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.v)}
              aria-pressed={selected}
              className={cn(
                "h-11 rounded-xl border text-sm font-semibold transition-all",
                selected
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/[0.03]"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/*  Price breakdown                                                            */
/* -------------------------------------------------------------------------- */

/** One label/amount row in the price breakdown. Hoisted to module scope —
 *  defining it inside PriceBreakdown remade the component every render. */
function Line({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{amount}</span>
    </div>
  );
}

export function PriceBreakdown({
  tier,
  cleaningFee,
  currency,
  serviceFee,
}: {
  tier: PricingTier;
  cleaningFee: number;
  currency: string;
  /** The card fee from app settings (rate + fixed), passed down from the server page. */
  serviceFee: ServiceFee;
}) {
  const b = calculateBookingPriceCents(
    dollarsToCents(tier.price),
    dollarsToCents(cleaningFee || 0),
    0,
    0,
    serviceFee
  );
  const fmt = (cents: number) => formatCentsAsCurrency(cents, { currency });

  return (
    <div className="space-y-2 rounded-2xl bg-muted/40 p-4">
      <Line label={`${tier.hours} hr charter`} amount={fmt(b.basePriceCents)} />
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Crew</span>
        <span className="font-medium text-emerald-600">Selection Included</span>
      </div>
      {b.cleaningFeeCents > 0 && <Line label="Cleaning fee" amount={fmt(b.cleaningFeeCents)} />}
      <Line
        label={`Card processing (${formatServiceFee(serviceFee)})`}
        amount={fmt(b.serviceFeeCents)}
      />
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <span className="font-semibold text-foreground">Total</span>
        <span className="text-xl font-bold text-primary">{fmt(b.totalPriceCents)}</span>
      </div>
    </div>
  );
}

/** Customer-facing add-on picker for the v2 booking form. */
export function AddOnsPicker({
  addOns,
  quantities,
  onChange,
  currency,
}: {
  addOns: ResolvedBoatAddOn[];
  quantities: Record<string, number>;
  onChange: (addOnId: string, quantity: number) => void;
  currency: string;
}) {
  const fmt = (cents: number) => formatCurrency(centsToDollars(cents), currency, { showCents: true });
  const paid = addOns.filter((a) => !a.isComplimentary);
  const complimentary = addOns.filter((a) => a.isComplimentary);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Add-ons</p>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {paid.map((a) => {
          const qty = quantities[a.addOnId] ?? 0;
          return (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">{fmt(a.priceCents)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Remove one ${a.name}`}
                  disabled={qty === 0}
                  onClick={() => onChange(a.addOnId, Math.max(0, qty - 1))}
                  className="grid size-7 place-items-center rounded-full border border-border text-foreground disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-medium tabular-nums">{qty}</span>
                <button
                  type="button"
                  aria-label={`Add one ${a.name}`}
                  onClick={() => onChange(a.addOnId, qty + 1)}
                  className="grid size-7 place-items-center rounded-full border border-border text-foreground"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
        {complimentary.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 p-3">
            <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
            <span className="text-sm font-medium text-emerald-600">Included</span>
          </div>
        ))}
      </div>
    </div>
  );
}
