"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { ActionItem, ActionKind } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { KIND_LABELS, Led, when } from "./action-item";
import { SegmentedPills } from "@/shared/admin/filters";
import { Panel } from "./Panel";

type Group = "all" | "customers" | "trips" | "system";

const GROUPS: Record<Exclude<Group, "all">, ActionKind[]> = {
  customers: ["lead", "change-request", "proposal-unpaid", "proposal-unsent"],
  trips: ["conflict", "captain", "balance", "past-due"],
  system: ["calendar-sync", "stripe"],
};

/** Each area has its own color, so the queue reads at a glance. */
const GROUP_CHIP: Record<Exclude<Group, "all">, string> = {
  customers: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  trips: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  system: "bg-violet-400/15 text-violet-300 ring-violet-400/30",
};

function groupOf(kind: ActionKind): Exclude<Group, "all"> {
  return (Object.keys(GROUPS) as Exclude<Group, "all">[]).find((g) => GROUPS[g].includes(kind)) ?? "system";
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
            <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium tabular-nums text-destructive ring-1 ring-inset ring-destructive/30">
              {urgent} urgent
            </span>
          )}
          <SegmentedPills<Group>
            label="Area"
            size="sm"
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
        <div className="flex items-center gap-2.5 px-5 py-10 text-sm text-muted-foreground">
          <Check className="size-4 text-success" />
          Nothing waiting here.
        </div>
      ) : (
        <ul className="p-2">
          {shown.map((item) => {
            const row = (
              <>
                <Led severity={item.severity} />
                <span className="hidden md:block">
                  <span
                    className={cn(
                      "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                      GROUP_CHIP[groupOf(item.kind)]
                    )}
                  >
                    {KIND_LABELS[item.kind]}
                  </span>
                </span>
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
              "grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-glass-inset md:grid-cols-[8px_140px_minmax(0,190px)_minmax(0,1fr)_auto]";
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
