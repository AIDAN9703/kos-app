"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Ship } from "lucide-react";

import type { FleetLeader } from "@/features/admin/dashboard.types";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";

/** This month's earning boats — rank, photo, share bar. Admins know boats by sight. */
export function FleetLeaders({ leaders, monthName }: { leaders: FleetLeader[]; monthName: string }) {
  const top = Math.max(...leaders.map((l) => l.gmvCents), 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col rounded-3xl border border-border/50 bg-card/60 p-6 backdrop-blur"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Fleet leaders</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{monthName} · GMV</p>
      </header>

      {leaders.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">No charters on the books for {monthName} yet.</p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {leaders.map((l, i) => (
            <li key={l.boatId}>
              <Link
                href={`/admin/boats/${l.boatId}`}
                className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
              >
                <span className="w-5 text-center font-mono text-xs tabular-nums text-muted-foreground/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {l.mainImage ? (
                  <Image src={l.mainImage} alt="" width={56} height={40} className="h-10 w-14 rounded-lg object-cover ring-1 ring-white/10" />
                ) : (
                  <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-secondary">
                    <Ship className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{l.name}</span>
                  <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.span
                      className="block h-full rounded-full bg-primary/80"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max((l.gmvCents / top) * 100, 4)}%` }}
                      transition={{ delay: 0.5 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums">{formatCentsCompact(l.gmvCents)}</span>
                  <span className="block text-[11px] text-muted-foreground">{l.trips} {l.trips === 1 ? "charter" : "charters"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </motion.section>
  );
}
