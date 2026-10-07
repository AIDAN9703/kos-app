"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { ActionItem, ActionKind } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { Panel, Segmented } from "./Panel";
import { elapsed } from "./format";

const KIND_LABELS: Record<ActionKind, string> = {
  conflict: "Calendar conflict",
  "change-request": "Change request",
  stripe: "Stripe event failed",
  captain: "No captain",
  balance: "Balance due",
  "past-due": "Past due",
  lead: "New lead",
  "proposal-unpaid": "Unpaid proposal",
  "proposal-unsent": "Unsent proposal",
  "calendar-sync": "Calendar sync",
};

type Group = "all" | "customers" | "trips" | "system";

const GROUPS: Record<Exclude<Group, "all">, ActionKind[]> = {
  customers: ["lead", "change-request", "proposal-unpaid", "proposal-unsent"],
  trips: ["conflict", "captain", "balance", "past-due"],
  system: ["calendar-sync", "stripe"],
};

const LED: Record<ActionItem["severity"], string> = {
  3: "bg-destructive shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_18%,transparent)]",
  2: "bg-warning",
  1: "bg-muted-foreground/40",
};

function when(item: ActionItem): string {
  if (item.tripStart) return formatBoatLocal(item.tripStart, item.timezone, "EEE MMM d, h:mm a");
  if (item.since) return `${elapsed(item.since)} ago`;
  return "";
}

/** Everything that needs a person, most urgent first, filterable by area. */
export function ActionQueue({ items }: { items: ActionItem[] }) {
  const [group, setGroup] = useState<Group>("all");
  const count = (g: Exclude<Group, "all">) => items.filter((i) => GROUPS[g].includes(i.kind)).length;
  const shown = group === "all" ? items : items.filter((i) => GROUPS[group].includes(i.kind));
  const urgent = items.filter((i) => i.severity === 3).length;

  return (
    <Panel
      title="Needs action"
      count={items.length}
      actions={
        <>
          {urgent > 0 && (
            <span className="text-xs font-medium tabular-nums text-destructive">{urgent} urgent</span>
          )}
          <Segmented<Group>
            value={group}
            onChange={setGroup}
            options={[
              { value: "all", label: "All", count: items.length },
              { value: "customers", label: "Customers", count: count("customers") },
              { value: "trips", label: "Trips", count: count("trips") },
              { value: "system", label: "System", count: count("system") },
            ]}
          />
        </>
      }
      bodyClassName="max-h-[560px] overflow-y-auto"
    >
      {shown.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-10 text-sm text-muted-foreground">
          <Check className="size-4 text-success" />
          Nothing waiting here.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((item) => {
            const row = (
              <>
                <span aria-hidden className={cn("size-2 rounded-full", LED[item.severity])} />
                <span className="hidden truncate text-xs text-muted-foreground md:block">{KIND_LABELS[item.kind]}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{item.subject}</span>
                  <span className="block truncate text-xs text-muted-foreground md:hidden">
                    {KIND_LABELS[item.kind]} · {item.detail}
                  </span>
                </span>
                <span className="hidden min-w-0 truncate text-[13px] text-muted-foreground md:block">
                  {item.boatName && <span className="text-foreground/75">{item.boatName} · </span>}
                  {item.detail}
                </span>
                <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {when(item)}
                  {item.external && <ArrowUpRight className="size-3.5" />}
                </span>
              </>
            );
            const className =
              "grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 md:grid-cols-[8px_128px_minmax(0,190px)_minmax(0,1fr)_auto]";
            return (
              <li key={item.key}>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {row}
                  </a>
                ) : (
                  <Link href={item.href} className={className}>
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
