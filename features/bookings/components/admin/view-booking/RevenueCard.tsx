import { GlassPanel } from "@/shared/admin/components/glass";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import type { DealEconomics } from "@/features/bookings/lib/booking-money";

/**
 * What KOS makes on this trip: the charter's value, what goes out (owner
 * payout, fuel, crew, dockage), and what's left. Customer money stays in
 * the Breakdown so the two never blur.
 */
export function RevenueCard({
  economics,
  expenseLineCount,
  currency,
}: {
  economics: DealEconomics;
  expenseLineCount: number;
  currency: string;
}) {
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });

  return (
    <GlassPanel title="Revenue" className="gap-4">
      <p className="-mt-2 text-xs text-muted-foreground">
        Charter value minus what we pay out is what KOS keeps.
      </p>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
        <Stat
          label="Charter value"
          caption={economics.gmvOverridden ? "override" : undefined}
          value={economics.gmvCents != null ? fmt(economics.gmvCents) : "—"}
        />
        <Stat
          label="Expenses"
          caption={
            expenseLineCount > 0
              ? `${expenseLineCount} ${expenseLineCount === 1 ? "line" : "lines"}`
              : "none yet"
          }
          value={economics.expenseCents > 0 ? fmt(economics.expenseCents) : "—"}
          className={economics.expenseCents > 0 ? "text-muted-foreground" : undefined}
        />
        <Stat
          label="KOS keeps"
          value={economics.revenueCents != null ? fmt(economics.revenueCents) : "—"}
          className={
            economics.revenueCents == null
              ? undefined
              : economics.revenueCents >= 0
                ? "text-success"
                : "text-destructive"
          }
        />
      </dl>
    </GlassPanel>
  );
}

function Stat({
  label,
  caption,
  value,
  className,
}: {
  label: string;
  caption?: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-baseline gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
        {caption ? (
          <span className="tracking-normal text-muted-foreground/70 normal-case">{caption}</span>
        ) : null}
      </dt>
      <dd className={cn("mt-1 truncate text-lg font-semibold tabular-nums", className)}>{value}</dd>
    </div>
  );
}
