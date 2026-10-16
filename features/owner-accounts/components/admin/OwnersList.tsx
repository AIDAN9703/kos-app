"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { GlassPanel } from "@/shared/admin/components/glass";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { OWNER_KIND_LABELS } from "../../owner-accounts.constants";
import type { OwnerAccountRow, OwnerAccountStatus } from "../../owner-accounts.types";

const STATUS: Record<OwnerAccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-success-soft text-success ring-success/25" },
  INVITED: { label: "Invite sent", className: "bg-info-soft text-info ring-info/25" },
  NOT_INVITED: {
    label: "Not invited",
    className: "bg-glass-inset text-muted-foreground ring-glass-border",
  },
};

const chip =
  "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap";

/** Every owner, searchable, with what KOS owes them now. KOS Yachts first. */
export function OwnersList({
  owners,
  owedNow,
}: {
  owners: OwnerAccountRow[];
  /** Cents owed for charters that are over, by owner id. */
  owedNow: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? owners.filter((o) => o.name.toLowerCase().includes(q)) : owners;

  return (
    <GlassPanel className="p-0">
      <div className="border-b border-glass-border p-4">
        <label className="flex h-10 max-w-sm items-center gap-2 rounded-full bg-glass-inset px-4 ring-1 ring-glass-border ring-inset">
          <Search aria-hidden className="size-4 text-muted-foreground" />
          <input
            id="owner-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search owners…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-glass-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Owner</th>
              <th className="py-2.5 font-medium">Type</th>
              <th className="py-2.5 text-right font-medium">Boats</th>
              <th className="py-2.5 text-right font-medium">People</th>
              <th className="py-2.5 text-right font-medium">Owed now</th>
              <th className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border">
            {shown.map((owner) => (
              <tr key={owner.id} className="transition-colors hover:bg-glass-inset">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/owners/${owner.id}`}
                    className="flex items-center gap-2 font-medium text-foreground hover:underline"
                  >
                    {owner.name}
                    {owner.isHouse ? (
                      <span
                        className={cn(chip, "bg-primary/15 text-primary-strong ring-primary/30")}
                      >
                        House
                      </span>
                    ) : null}
                  </Link>
                </td>
                <td className="py-3 text-muted-foreground">{OWNER_KIND_LABELS[owner.kind]}</td>
                <td className="py-3 text-right text-foreground/85 tabular-nums">
                  {owner.boatCount}
                </td>
                <td className="py-3 text-right text-foreground/85 tabular-nums">
                  {owner.memberCount}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {owedNow[owner.id] ? (
                    <span className="font-medium text-foreground">
                      {formatCentsAsCurrency(owedNow[owner.id], { showCents: false })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {owner.isHouse ? (
                    <span className="text-xs text-muted-foreground">KOS team</span>
                  ) : (
                    <span className={cn(chip, STATUS[owner.status].className)}>
                      {STATUS[owner.status].label}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">No owner matches that.</p>
      ) : null}
    </GlassPanel>
  );
}
