import type { DeskNumbers, RevenueMonth } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";
import { plural } from "./format";

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${28 - (v / max) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden className="h-7 w-24 overflow-visible">
      <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface Cell {
  label: string;
  value: string;
  tone?: "destructive";
  spark?: number[];
}

/** One row of figures, hairline-divided: a label and a number, nothing else. */
export function NumbersStrip({ trend, numbers }: { trend: RevenueMonth[]; numbers: DeskNumbers }) {
  const month = trend[trend.length - 1];
  const monthName = month?.monthName ?? "this month";

  const cells: Cell[] = [
    {
      label: `Booked in ${monthName}`,
      value: formatCentsCompact(month?.gmvCents ?? 0),
      spark: trend.map((m) => m.gmvCents),
    },
    { label: `KOS revenue, ${monthName}`, value: formatCentsCompact(month?.revenueCents ?? 0) },
    {
      label: `Open proposals (${numbers.openProposals.count})`,
      value: formatCentsCompact(numbers.openProposals.valueCents),
    },
    {
      label: `Owed by guests (${plural(numbers.owed.trips, "trip")})`,
      value: formatCentsCompact(numbers.owed.dueCents),
      tone: numbers.owed.dueCents > 0 ? "destructive" : undefined,
    },
    { label: "Total users", value: numbers.totalUsers.toLocaleString() },
    { label: "Total boats", value: numbers.totalBoats.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3 xl:grid-cols-6">
      {cells.map((c) => (
        <div key={c.label} className="flex min-w-0 flex-col bg-card px-4 py-3.5">
          <p className="truncate text-xs text-muted-foreground">{c.label}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p
              className={cn(
                "text-[26px] font-semibold leading-none tracking-tight tabular-nums",
                c.tone === "destructive" ? "text-destructive" : "text-foreground"
              )}
            >
              {c.value}
            </p>
            {c.spark && <Spark values={c.spark} />}
          </div>
        </div>
      ))}
    </div>
  );
}
