import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { surface } from "@/features/profile/components/surface";
import { yearOverYear } from "../owner-presentation";
import type { OwnerKpis as Kpis } from "../owner.types";

/** The four numbers an owner checks first. Each appears once on the page. */
export function OwnerKpis({ kpis, year }: { kpis: Kpis; year: number }) {
  const delta = yearOverYear(kpis.earningsThisYearCents, kpis.earningsSamePeriodLastYearCents);
  const cards = [
    {
      label: `Earnings ${year}`,
      value: formatCentsAsWholeDollars(kpis.earningsThisYearCents),
      detail: delta?.label ?? "Your payouts this year",
      detailTone: delta ? (delta.up ? "text-success" : "text-destructive") : "text-slate-500",
    },
    {
      label: "Outstanding payouts",
      value: formatCentsAsWholeDollars(kpis.pendingPayoutCents),
      detail: `${formatCentsAsWholeDollars(kpis.paidOutCents)} paid to you`,
      detailTone: "text-slate-500",
    },
    {
      label: "Charters completed",
      value: String(kpis.completedThisYear),
      detail: `${kpis.hoursThisYear.toLocaleString("en-US")} hours on the water this year`,
      detailTone: "text-slate-500",
    },
    {
      label: "Occupancy, next 30 days",
      value: `${kpis.occupancyNext30}%`,
      detail: `${kpis.bookedDaysNext30} boat-${kpis.bookedDaysNext30 === 1 ? "day" : "days"} booked`,
      detailTone: "text-slate-500",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`p-4 sm:p-5 ${surface}`}>
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">{card.label}</dt>
          <dd className="mt-2">
            <span className="block text-2xl font-bold sm:text-3xl tracking-tight text-primary tabular-nums">
              {card.value}
            </span>
            <span className={cn("mt-1 block text-xs sm:text-sm", card.detailTone)}>
              {card.detail}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
