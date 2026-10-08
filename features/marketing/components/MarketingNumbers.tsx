import type { ContactSummary } from "@/features/marketing/marketing.types";
import { cn } from "@/shared/lib/utils/general-utils";

/** Subscribed, lists, unsubscribed, waiting to sync: a label and a number each. */
export function MarketingNumbers({ summary }: { summary: ContactSummary }) {
  const cells = [
    { label: "Subscribed", value: summary.subscribed },
    { label: "Lists", value: summary.sources.length },
    { label: "Unsubscribed", value: summary.unsubscribed },
    { label: "Waiting to sync", value: summary.pending, warn: summary.pending > 0 },
  ];
  return (
    <div className="glass-panel grid grid-cols-2 overflow-hidden md:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="border-glass-border px-5 py-4 even:border-l [&:nth-child(n+3)]:border-t md:border-l md:first:border-l-0 md:[&:nth-child(n+3)]:border-t-0"
        >
          <p className="text-[11px] text-muted-foreground">{c.label}</p>
          <p className={cn("mt-1.5 text-2xl font-semibold tabular-nums", c.warn ? "text-warning" : "text-foreground")}>
            {c.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
