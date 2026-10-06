"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Bot, Sparkles, UserRound } from "lucide-react";

import type { ActivityItem } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";

/** Color by what happened: money green, sends gold, customer actions sky, else neutral. */
function tone(eventType: string) {
  if (/payment|paid|confirmed/.test(eventType)) return "bg-success";
  if (/published|proposal|sent/.test(eventType)) return "bg-primary";
  if (/accepted|change_requested|lead\./.test(eventType)) return "bg-sky-400";
  if (/cancel|lost|refund/.test(eventType)) return "bg-destructive";
  return "bg-white/30";
}

function fallbackMessage(eventType: string) {
  return eventType.replace(/^(booking|lead)\./, "").replace(/_/g, " ");
}

/** The desk's pulse — the latest events across every deal, newest first. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col rounded-3xl border border-border/50 bg-card/60 p-6 backdrop-blur"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Activity</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">across all deals</p>
      </header>

      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">Quiet so far.</p>
      ) : (
        <ol className="relative mt-4 space-y-0.5 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-white/[0.08]">
          {items.map((it) => {
            const Actor = it.actorType === "admin" ? UserRound : it.actorType === "user" ? Sparkles : Bot;
            return (
              <li key={it.id}>
                <Link
                  href={`/admin/bookings/${it.bookingId}`}
                  className="group relative flex items-start gap-3 rounded-xl py-2 pl-0 pr-2 transition-colors hover:bg-white/[0.03]"
                >
                  <span className={cn("relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-card", tone(it.eventType))} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      <span className="font-medium">{it.customerName ?? "Unnamed deal"}</span>
                      <span className="text-muted-foreground"> · {it.message ?? fallbackMessage(it.eventType)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                      <Actor className="h-3 w-3" aria-hidden />
                      {formatDistanceToNowStrict(it.createdAt)} ago
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
