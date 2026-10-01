"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { surface } from "@/features/profile/components/surface";
import type { MonthlyPoint } from "../owner.types";

type Measure = "earnings" | "charters";

const MEASURES: Record<
  Measure,
  {
    title: string;
    label: string;
    value: (p: MonthlyPoint) => number;
    format: (n: number) => string;
  }
> = {
  earnings: {
    title: "Earnings by month",
    label: "Earnings",
    value: (p) => p.earningsCents / 100,
    format: (dollars) => formatCentsAsWholeDollars(Math.round(dollars * 100)),
  },
  charters: {
    title: "Charters by month",
    label: "Charters",
    value: (p) => p.charters,
    format: (n) => `${n} ${n === 1 ? "charter" : "charters"}`,
  },
};

/** Site navy — the single series color. */
const BAR = "#27445c";

/**
 * The last 12 months as one bar series. Earnings and charter counts have
 * different scales, so they toggle rather than share an axis.
 */
export function ActivityChart({ monthly }: { monthly: MonthlyPoint[] }) {
  const [measure, setMeasure] = useState<Measure>("earnings");
  const { title, value, format } = MEASURES[measure];
  const data = monthly.map((p) => ({ ...p, value: value(p) }));
  const isEmpty = data.every((p) => p.value === 0);

  return (
    <section aria-labelledby="activity-heading" className={`p-5 sm:p-6 ${surface}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="text-lg font-semibold text-primary">
            {title}
          </h2>
          <p className="text-sm text-slate-500">Last 12 months</p>
        </div>
        <div role="radiogroup" aria-label="Measure" className="flex rounded-full bg-slate-100 p-1">
          {(Object.keys(MEASURES) as Measure[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={measure === key}
              onClick={() => setMeasure(key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                measure === key
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-primary"
              )}
            >
              {MEASURES[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke="#e8ecf1" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveEnd"
              minTickGap={6}
              tickMargin={10}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={measure === "earnings" ? 52 : 28}
              allowDecimals={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(n: number) =>
                measure === "earnings"
                  ? n >= 1000
                    ? `$${Math.round(n / 1000)}k`
                    : `$${n}`
                  : String(n)
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(39, 68, 92, 0.06)" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  | (MonthlyPoint & { value: number })
                  | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
                    <p className="font-semibold text-primary">{point.longLabel}</p>
                    <p className="text-slate-600 tabular-nums">{format(point.value)}</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill={BAR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              animationDuration={500}
            />
          </BarChart>
        </ResponsiveContainer>
        {isEmpty ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            No charters in the last 12 months yet
          </p>
        ) : null}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-500 hover:text-primary">
          View as table
        </summary>
        <table className="mt-3 w-full text-left">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="py-1.5 font-medium">Month</th>
              <th className="py-1.5 text-right font-medium">Charters</th>
              <th className="py-1.5 text-right font-medium">Earnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-slate-700 tabular-nums">
            {monthly.map((p) => (
              <tr key={p.key}>
                <td className="py-1.5">{p.longLabel}</td>
                <td className="py-1.5 text-right">{p.charters}</td>
                <td className="py-1.5 text-right">{formatCentsAsWholeDollars(p.earningsCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
