import Image from "next/image";
import type { DeskNumbers, RevenueMonth } from "@/features/admin/dashboard.types";
import { NewBookingModal } from "@/features/bookings/components/admin/new-booking-modal";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";
import { GlassStat } from "@/shared/admin/components/glass";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";
import { plural } from "./format";

/** The fleet rafted up on dark water: room on the left for the greeting. */
const PHOTO = "/images/boats/aerial6.jpg";

/** Booked value by month, as a glowing gold line with a soft fill under it. */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / Math.max(values.length - 1, 1)) * 100, 46 - (v / max) * 40] as const);
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = pts[pts.length - 1] ?? [100, 46];
  return (
    <svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden className="h-14 w-44 overflow-visible">
      <defs>
        <linearGradient id="desk-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,50 ${line} 100,50`} fill="url(#desk-spark-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: "drop-shadow(0 0 6px var(--primary))" }}
      />
      <circle cx={lastX} cy={lastY} r="3" fill="var(--primary)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * The top of the desk: greeting and New booking, this month's booked value,
 * and the other headline numbers as frosted chips, over the fleet photo.
 */
export function DeskHero({
  firstName,
  pricingTiers,
  trend,
  numbers,
}: {
  firstName: string | null;
  pricingTiers: PricingTierOption[];
  trend: RevenueMonth[];
  numbers: DeskNumbers;
}) {
  const month = trend[trend.length - 1];
  const monthName = month?.monthName ?? "this month";

  return (
    <section className="glass-panel relative isolate overflow-hidden p-0">
      <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-full md:w-[60%]">
        <Image src={PHOTO} alt="" fill priority sizes="(min-width: 768px) 60vw, 100vw" className="object-cover object-[50%_55%]" />
        {/* Fade into the panel on the left and bottom so text sits on dark water. */}
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background/70 via-transparent to-transparent" />
      </div>
      <div className="absolute inset-0 -z-20 bg-background" />

      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Welcome back{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <NewBookingModal
            pricingTiers={pricingTiers}
            canLinkAccounts
            triggerLabel="New booking"
            triggerClassName="h-10 rounded-full px-5 text-sm font-semibold shadow-[0_8px_30px_-8px_var(--primary)]"
          />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Booked in {monthName}</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
            <p className="text-5xl font-semibold leading-none tracking-tight tabular-nums text-foreground md:text-6xl">
              {formatCentsCompact(month?.gmvCents ?? 0)}
            </p>
            <Spark values={trend.map((m) => m.gmvCents)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          <GlassStat size="lg" label={`KOS revenue, ${monthName}`} value={formatCentsCompact(month?.revenueCents ?? 0)} />
          <GlassStat
            size="lg"
            label={`Outstanding balances (${plural(numbers.owed.trips, "trip")})`}
            value={
              <span className={numbers.owed.dueCents > 0 ? "text-destructive" : undefined}>
                {formatCentsCompact(numbers.owed.dueCents)}
              </span>
            }
          />
          <GlassStat size="lg" label="Trips, next 7 days" value={numbers.tripsNextWeek.toLocaleString()} />
          <GlassStat size="lg" label="Total users" value={numbers.totalUsers.toLocaleString()} />
          <GlassStat size="lg" label="Total boats" value={numbers.totalBoats.toLocaleString()} />
        </div>
      </div>
    </section>
  );
}
