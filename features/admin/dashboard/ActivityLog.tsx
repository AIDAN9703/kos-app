import Link from "next/link";
import type { ActivityItem } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { Panel } from "./Panel";
import { elapsed } from "./format";

const KIND: Record<ActivityItem["kind"], { verb: string; amount: string; sign: string }> = {
  paid: { verb: "Paid", amount: "text-success", sign: "+" },
  refund: { verb: "Refunded", amount: "text-foreground", sign: "−" },
  failed: { verb: "Payment failed", amount: "text-destructive", sign: "" },
  dispute: { verb: "Dispute", amount: "text-destructive", sign: "" },
};

/** Money that moved across every deal: payments, refunds, failures, disputes. A row opens the deal. */
export function ActivityLog({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <Panel title="Activity" className={className} bodyClassName="max-h-[640px] overflow-y-auto xl:max-h-none">
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <ul className="p-2">
          {items.map((a) => {
            const k = KIND[a.kind];
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/bookings/${a.bookingId}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-glass-inset"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{a.customerName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {k.verb}
                      {a.detail ? ` · ${a.detail}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {a.amountCents != null && (
                      <span className={cn("block text-sm font-semibold tabular-nums", k.amount)}>
                        {k.sign}
                        {formatCentsAsWholeDollars(a.amountCents)}
                      </span>
                    )}
                    <span className="block text-[11px] tabular-nums text-muted-foreground">{elapsed(a.at)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
