import Link from "next/link";
import type { ActivityItem } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { Panel } from "./Panel";
import { elapsed } from "./format";

/* Who acted: the team, the customer, or the system (Stripe, sync, email). */
const ACTOR_DOT: Record<string, string> = {
  admin: "bg-primary",
  user: "bg-info",
  system: "bg-muted-foreground/50",
};

/** The latest events that matter, across every deal. */
export function ActivityLog({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <Panel title="Activity" className={className} bodyClassName="max-h-[640px] overflow-y-auto xl:max-h-none">
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/bookings/${a.bookingId}`}
                className="grid grid-cols-[34px_8px_minmax(0,1fr)] items-center gap-2.5 px-4 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="text-[11px] tabular-nums text-muted-foreground">{elapsed(a.createdAt)}</span>
                <span aria-hidden className={cn("size-1.5 rounded-full", ACTOR_DOT[a.actorType] ?? ACTOR_DOT.system)} />
                <span className="truncate text-[13px]">
                  <span className="font-medium text-foreground">{a.customerName ?? "Deal"}</span>
                  <span className="text-muted-foreground"> · {a.message ?? a.eventType}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
