"use client";

import { useEffect, useState, type ReactNode } from "react";
import { animate, motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { RevenueMonth } from "@/features/admin/dashboard";
import type { BookingListItem } from "@/features/bookings/booking.types";
import { readinessGaps } from "@/features/bookings/lib/trip-readiness";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";

/** Numbers count up on mount — the panel feels like it's powering on. */
function useCountUp(target: number, duration = 1.1) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [target, duration]);
  return value;
}

function BigDollars({ cents }: { cents: number }) {
  const v = useCountUp(cents);
  return <>{`$${Math.round(v / 100).toLocaleString()}`}</>;
}

function BigInt_({ n }: { n: number }) {
  const v = useCountUp(n, 0.9);
  return <>{Math.round(v)}</>;
}

/**
 * The bridge: one instrument panel. Left, the month's charter volume as the
 * headline with a live sparkline of the trailing year glowing beneath it.
 * Right, three readouts — revenue, charters, departures — each with a
 * single line of context that only appears when it means something.
 */
export function HeroBand({
  greeting,
  firstName,
  dateLabel,
  trend,
  upcomingTrips,
  action,
}: {
  greeting: string;
  firstName: string | null;
  dateLabel: string;
  trend: RevenueMonth[];
  upcomingTrips: BookingListItem[];
  action: ReactNode;
}) {
  const thisMonth = trend[trend.length - 1];
  const spark = trend.map((m) => ({ label: m.label, gmv: m.gmvCents / 100, revenue: m.revenueCents / 100 }));
  const marginPct =
    thisMonth.gmvCents > 0 && thisMonth.revenueCents > 0
      ? Math.round((thisMonth.revenueCents / thisMonth.gmvCents) * 100)
      : null;
  const avgCents = thisMonth.trips > 0 ? Math.round(thisMonth.gmvCents / thisMonth.trips) : 0;
  const needsPrep = upcomingTrips.filter((t) => readinessGaps(t).length > 0).length;
  const next = upcomingTrips[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="kos-bridge relative overflow-hidden rounded-3xl border border-primary/15 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
    >
      {/* Layers: deep navy gradient → fine grid → slow gold sheen */}
      <div aria-hidden className="absolute inset-0 bg-linear-to-br from-[#0f1f2e] via-[#0b1826] to-[#08121d]" />
      <div aria-hidden className="kos-bridge-grid absolute inset-0 opacity-[0.35]" />
      <div aria-hidden className="kos-bridge-sheen absolute inset-0" />
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10 lg:p-10">
        {/* ── Headline ── */}
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-primary-strong/80">
                {dateLabel}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white/90 sm:text-3xl">
                {greeting}
                {firstName ? `, ${firstName}` : ""}
              </h1>
            </div>
            {action}
          </div>

          <div className="relative mt-8 flex-1">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
              {thisMonth.monthName} charter volume
            </p>
            <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-white sm:text-6xl lg:text-7xl [text-shadow:0_0_24px_rgba(212,175,55,0.14)]">
              <BigDollars cents={thisMonth.gmvCents} />
            </p>

            {/* Sparkline of the trailing year, glowing gold */}
            <div className="mt-6 h-24 w-full sm:h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="bridgeSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bridgeSparkSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <filter id="bridgeGlow" x="-20%" y="-50%" width="140%" height="200%">
                      <feGaussianBlur stdDeviation="1.6" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#38bdf8"
                    strokeOpacity={0.7}
                    strokeWidth={1.5}
                    fill="url(#bridgeSparkSky)"
                    isAnimationActive
                    animationDuration={1400}
                  />
                  <Area
                    type="monotone"
                    dataKey="gmv"
                    stroke="var(--color-primary)"
                    strokeWidth={2.25}
                    fill="url(#bridgeSpark)"
                    filter="url(#bridgeGlow)"
                    isAnimationActive
                    animationDuration={1400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
              <span>{trend[0]?.label}</span>
              <span className="flex items-center gap-4">
                <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />volume</span>
                <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sky-400 align-middle" />revenue</span>
                <span>· trailing {trend.length} months</span>
              </span>
              <span>{thisMonth.label}</span>
            </p>
          </div>
        </div>

        {/* ── Readouts ── */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Readout
            label="KOS revenue"
            value={<BigDollars cents={thisMonth.revenueCents} />}
            sub={marginPct != null ? `${marginPct}% of volume` : undefined}
            accent="gold"
            delay={0.15}
          />
          <Readout
            label="Charters"
            value={<BigInt_ n={thisMonth.trips} />}
            sub={avgCents > 0 ? `${formatCentsCompact(avgCents)} average` : undefined}
            accent="sky"
            delay={0.25}
          />
          <Readout
            label="Departures · 30 days"
            value={<BigInt_ n={upcomingTrips.length} />}
            sub={
              next
                ? `Next · ${next.boatName ?? "Boat TBD"} · ${formatBoatLocal(next.startDateTime, next.boatTimezone, "EEE h:mm a")}`
                : undefined
            }
            badge={
              upcomingTrips.length === 0
                ? undefined
                : needsPrep > 0
                  ? { text: `${needsPrep} to prep`, tone: "warning" }
                  : { text: "All ready", tone: "success" }
            }
            accent="emerald"
            delay={0.35}
          />
        </div>
      </div>
    </motion.section>
  );
}

const ACCENT = {
  gold: "bg-primary",
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
} as const;

function Readout({
  label,
  value,
  sub,
  badge,
  accent,
  delay,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  badge?: { text: string; tone: "warning" | "success" };
  accent: keyof typeof ACCENT;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 backdrop-blur"
    >
      {/* Accent bar down the left edge */}
      <span aria-hidden className={cn("absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full opacity-90", ACCENT[accent])} />
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">{label}</p>
        {badge ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              badge.tone === "warning" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
      {sub ? <p className="mt-1 truncate text-xs text-white/50">{sub}</p> : null}
    </motion.div>
  );
}
