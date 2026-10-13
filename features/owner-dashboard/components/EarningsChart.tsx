"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SegmentedPills } from "@/shared/admin/filters/SegmentedPills";
import { GlassPanel } from "@/shared/admin/components/glass";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import type { MonthlyPoint } from "../owner.types";

type Measure = "earnings" | "charters";

const MEASURES: Record<
  Measure,
  { label: string; value: (p: MonthlyPoint) => number; format: (n: number) => string }
> = {
  earnings: {
    label: "Earnings",
    value: (p) => p.earningsCents / 100,
    format: (dollars) => formatCentsAsWholeDollars(Math.round(dollars * 100)),
  },
  charters: {
    label: "Charters",
    value: (p) => p.charters,
    format: (n) => `${n} ${n === 1 ? "charter" : "charters"}`,
  },
};

/**
 * The last 12 months as gold bars, the current month lit. Earnings and
 * charter counts have different scales, so they toggle instead of sharing
 * an axis. A hidden table carries the same numbers for screen readers.
 */
export function EarningsChart({
  monthly,
  title = "Last 12 months",
  className,
}: {
  monthly: MonthlyPoint[];
  title?: string;
  className?: string;
}) {
  const [measure, setMeasure] = useState<Measure>("earnings");
  const { value, format } = MEASURES[measure];
  const data = monthly.map((p) => ({ ...p, value: value(p) }));
  const isEmpty = data.every((p) => p.value === 0);
  // The current month is the last one that isn't ahead of today.
  const currentIndex = data.reduce((last, p, i) => (p.future ? last : i), data.length - 1);
  const hasFuture = data.some((p) => p.future);

  return (
    <GlassPanel
      title={title}
      className={className}
      aside={
        <SegmentedPills
          label="Measure"
          size="sm"
          value={measure}
          onChange={setMeasure}
          options={[
            { value: "earnings", label: "Earnings" },
            { value: "charters", label: "Charters" },
          ]}
        />
      }
    >
      <div className="relative h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            barCategoryGap="28%"
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveEnd"
              minTickGap={6}
              tickMargin={10}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={measure === "earnings" ? 48 : 24}
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(n: number) =>
                measure === "earnings"
                  ? n >= 1000
                    ? `$${Math.round(n / 1000)}k`
                    : `$${n}`
                  : String(n)
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  | (MonthlyPoint & { value: number })
                  | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-xl border border-glass-border bg-popover px-3 py-2 text-sm shadow-lg">
                    <p className="font-semibold text-foreground">{point.longLabel}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {format(point.value)}
                      {point.future ? " booked" : ""}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={30} animationDuration={500}>
              {data.map((p, i) => (
                <Cell
                  key={p.key}
                  fill={p.future ? "var(--info)" : "var(--primary)"}
                  fillOpacity={p.future ? 0.55 : i === currentIndex ? 1 : 0.45}
                  style={
                    i === currentIndex
                      ? { filter: "drop-shadow(0 0 10px var(--primary))" }
                      : undefined
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {isEmpty ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No charters in the last 12 months yet
          </p>
        ) : null}
      </div>

      {hasFuture ? (
        <p className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" /> Sailed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-info/60" /> Booked ahead
          </span>
        </p>
      ) : null}

      <table className="sr-only">
        <caption>{MEASURES[measure].label} by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Charters</th>
            <th>Earnings</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((p) => (
            <tr key={p.key}>
              <td>{p.longLabel}</td>
              <td>{p.charters}</td>
              <td>{formatCentsAsWholeDollars(p.earningsCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassPanel>
  );
}
