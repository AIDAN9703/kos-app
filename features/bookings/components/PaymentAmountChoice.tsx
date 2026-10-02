"use client";

import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";

/**
 * "Pay the deposit" vs "Pay in full" — the one chooser used wherever a guest
 * pays (proposal page, trip page). Amounts already include the card fee.
 */
export function PaymentAmountChoice({
  value,
  onChange,
  depositCents,
  fullCents,
  currency = "USD",
}: {
  value: "deposit" | "full";
  onChange: (value: "deposit" | "full") => void;
  depositCents: number;
  fullCents: number;
  currency?: string;
}) {
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How much to pay now">
      <Option
        active={value === "deposit"}
        label="Pay the deposit"
        detail={`${fmt(depositCents)} now`}
        onClick={() => onChange("deposit")}
      />
      <Option
        active={value === "full"}
        label="Pay in full"
        detail={`${fmt(fullCents)} now`}
        onClick={() => onChange("full")}
      />
    </div>
  );
}

function Option({
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
        active
          ? "border-2 border-primary bg-primary/5"
          : "border border-border/60 hover:bg-muted/50"
      )}
    >
      <span className="block text-sm font-semibold text-primary">{label}</span>
      <span className="block text-xs text-slate-500">{detail}</span>
    </button>
  );
}
