"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { LeadIntake as LeadIntakeData } from "@/features/admin/dashboard.types";
import { DEAL_SOURCE_LABELS, SOURCE_BADGE_CLASSES } from "@/features/bookings/deal-status";
import { cn } from "@/shared/lib/utils/general-utils";

/**
 * Where business comes from: new deals per day for the last 30 days as a
 * bar strip, plus the channel mix. Until GA4 is connected this IS the
 * traffic view — every bar is a real person who asked about a boat.
 */
export function LeadIntake({ intake }: { intake: LeadIntakeData }) {
  const max = Math.max(...intake.days.map((d) => d.count), 1);
  const delta =
    intake.previousTotal > 0 ? (intake.total - intake.previousTotal) / intake.previousTotal : null;
  const sourceTotal = intake.bySource.reduce((a, s) => a + s.count, 0) || 1;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col rounded-3xl border border-border/50 bg-card/60 p-6 backdrop-blur"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Lead intake</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            new deals · last {intake.days.length} days
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{intake.total}</p>
          {delta != null ? (
            <p
              className={cn(
                "flex items-center justify-end gap-0.5 text-[11px] font-medium tabular-nums",
                delta >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(Math.round(delta * 100))}% vs prior {intake.days.length}d
            </p>
          ) : null}
        </div>
      </header>

      {/* Daily bars */}
      <div className="mt-5 flex h-20 items-end gap-[3px]" role="img" aria-label="New deals per day">
        {intake.days.map((d, i) => (
          <motion.span
            key={d.key}
            title={`${d.label}: ${d.count}`}
            className={cn(
              "flex-1 rounded-t-sm",
              d.count > 0 ? "bg-linear-to-t from-primary/50 to-primary" : "bg-white/[0.05]"
            )}
            initial={{ height: 0 }}
            animate={{ height: `${d.count > 0 ? Math.max((d.count / max) * 100, 10) : 6}%` }}
            transition={{ delay: 0.4 + i * 0.012, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <p className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
        <span>{intake.days[0]?.label}</span>
        <span>{intake.days[intake.days.length - 1]?.label}</span>
      </p>

      {/* Channel mix */}
      <ul className="mt-5 space-y-2">
        {intake.bySource.slice(0, 5).map((s) => (
          <li key={s.source} className="flex items-center gap-3 text-xs">
            <span
              className={cn(
                "w-24 shrink-0 truncate rounded-md px-1.5 py-0.5 text-center text-[10px] font-semibold",
                SOURCE_BADGE_CLASSES[s.source] ?? SOURCE_BADGE_CLASSES.OTHER
              )}
            >
              {DEAL_SOURCE_LABELS[s.source] ?? s.source}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.span
                className="block h-full rounded-full bg-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${(s.count / sourceTotal) * 100}%` }}
                transition={{ delay: 0.6, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
            <span className="w-8 text-right tabular-nums text-muted-foreground">{s.count}</span>
          </li>
        ))}
        {intake.bySource.length === 0 ? (
          <li className="text-xs text-muted-foreground">No new deals in this window.</li>
        ) : null}
      </ul>
    </motion.section>
  );
}
