import Image from "next/image";
import { GlassStat } from "@/shared/admin/components/glass";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { countdown } from "../owner-insights";
import type { MonthlyPoint, OwnerCharter, OwnerKpis } from "../owner.types";

/** Earnings by month as a glowing gold line with a soft fill (the admin desk's sparkline). */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const pts = values.map(
    (v, i) => [(i / Math.max(values.length - 1, 1)) * 100, 46 - (v / max) * 40] as const
  );
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = pts[pts.length - 1] ?? [100, 46];
  return (
    <svg
      viewBox="0 0 100 50"
      preserveAspectRatio="none"
      aria-hidden
      className="h-14 w-44 overflow-visible"
    >
      <defs>
        <linearGradient id="owner-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,50 ${line} 100,50`} fill="url(#owner-spark-fill)" />
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
 * The top of the overview, over the owner's own boat: the greeting, this
 * year's earnings with the 12-month trend, and four frosted chips with the
 * numbers owners ask about first.
 */
export function OwnerHero({
  firstName,
  photo,
  kpis,
  monthly,
  next,
}: {
  firstName: string;
  photo: string | null;
  kpis: OwnerKpis;
  monthly: MonthlyPoint[];
  next: OwnerCharter | null;
}) {
  const year = new Date().getFullYear();
  return (
    <section className="glass-panel relative isolate overflow-hidden p-0">
      <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-full md:w-[62%]">
        <Image
          src={photo || "/images/boats/aerial6.jpg"}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 62vw, 100vw"
          className="object-cover object-center"
        />
        {/* Fade into the panel on the left and bottom so the text sits on dark. */}
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/65 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background/75 via-transparent to-transparent" />
        {/* Phones: the photo runs under the text, so dim it all. */}
        <div className="absolute inset-0 bg-background/45 md:hidden" />
      </div>
      <div className="absolute inset-0 -z-20 bg-background" />

      <div className="flex flex-col gap-8 p-6 md:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Welcome back, {firstName}
        </h1>

        <div>
          <p className="text-sm text-muted-foreground">Earned in {year}</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
            <p className="text-5xl leading-none font-semibold tracking-tight text-foreground tabular-nums md:text-6xl">
              {formatCentsAsWholeDollars(kpis.earningsThisYearCents)}
            </p>
            <Spark values={monthly.map((m) => m.earningsCents)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[repeat(4,minmax(0,200px))]">
          <GlassStat
            size="lg"
            label="Owed to you"
            value={
              <span className={kpis.pendingPayoutCents > 0 ? "text-primary-strong" : undefined}>
                {formatCentsAsWholeDollars(kpis.pendingPayoutCents)}
              </span>
            }
          />
          <GlassStat
            size="lg"
            label={`Paid in ${year}`}
            value={formatCentsAsWholeDollars(kpis.paidThisYearCents)}
          />
          <GlassStat
            size="lg"
            label="Next charter"
            value={
              next ? (
                <>
                  {countdown(next.startsAt)}
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                    {formatBoatLocal(next.startsAt, next.timezone, "MMM d")}
                  </span>
                </>
              ) : (
                "None booked"
              )
            }
          />
          <GlassStat
            size="lg"
            label="Booked ahead"
            value={formatCentsAsWholeDollars(kpis.bookedAheadCents)}
          />
        </div>
      </div>
    </section>
  );
}
