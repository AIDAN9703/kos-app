import Link from "next/link";
import type { ActivityItem } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { Panel } from "./Panel";
import { elapsed } from "./format";

const KIND: Record<ActivityItem["kind"], { verb: string; dot: string; amount: string }> = {
  paid: { verb: "paid", dot: "bg-success", amount: "text-success" },
  refund: { verb: "refunded", dot: "bg-info", amount: "text-foreground" },
  failed: { verb: "payment failed", dot: "bg-destructive", amount: "text-destructive" },
  dispute: { verb: "dispute", dot: "bg-destructive", amount: "text-destructive" },
};

/** Money that moved across every deal: payments, refunds, failures, disputes. */
export function ActivityLog({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <Panel title="Activity" className={className} bodyClassName="max-h-[640px] overflow-y-auto xl:max-h-none">
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => {
            const k = KIND[a.kind];
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/bookings/${a.bookingId}`}
                  className="grid grid-cols-[30px_8px_minmax(0,1fr)] items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span className="pt-px text-[11px] tabular-nums text-muted-foreground">{elapsed(a.at)}</span>
                  <span aria-hidden className={cn("mt-1.5 size-1.5 rounded-full", k.dot)} />
                  <span className="min-w-0 text-[13px]">
                    <span className="block truncate">
                      <span className="font-medium text-foreground">{a.customerName}</span>
                      <span className="text-muted-foreground"> {k.verb} </span>
                      {a.amountCents != null && (
                        <span className={cn("font-semibold tabular-nums", k.amount)}>
                          {formatCentsAsWholeDollars(a.amountCents)}
                        </span>
                      )}
                    </span>
                    {a.detail && <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>}
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
