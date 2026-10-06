"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { AdminWorkload } from "@/features/admin/dashboard.types";
import { adminInitials } from "@/shared/lib/utils/people-display";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";

/** Who's carrying what: live deals and their value per admin, unassigned last. */
export function TeamWorkload({ workload }: { workload: AdminWorkload[] }) {
  const max = Math.max(...workload.map((w) => w.liveDeals), 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col rounded-3xl border border-border/50 bg-card/60 p-6 backdrop-blur"
    >
      <header>
        <h2 className="text-base font-semibold tracking-tight">Live deals per admin</h2>
      </header>

      {workload.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">No live deals.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {workload.map((w, i) => {
            const unassigned = w.adminId === null;
            const href = unassigned ? "/admin/bookings?scope=unassigned" : `/admin/bookings?assignedAdminId=${w.adminId}`;
            return (
              <li key={w.adminId ?? "unassigned"}>
                <Link href={href} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold",
                      unassigned ? "bg-warning/15 text-warning" : "bg-primary/15 text-foreground"
                    )}
                  >
                    {unassigned ? "+" : adminInitials(w.name) || "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm font-medium", unassigned ? "text-warning" : "text-foreground")}>{w.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatCentsCompact(w.valueCents)}</span>
                    </span>
                    <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.span
                        className={cn("block h-full rounded-full", unassigned ? "bg-warning/70" : "bg-sky-400/70")}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max((w.liveDeals / max) * 100, 4)}%` }}
                        transition={{ delay: 0.55 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </span>
                  </span>
                  <span className="w-8 text-right text-sm font-semibold tabular-nums">{w.liveDeals}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
