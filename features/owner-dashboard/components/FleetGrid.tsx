import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { TRIP_FALLBACK_IMAGE } from "@/features/profile/trip-presentation";
import { categoryLabel, listingChip, ownerBoatHref } from "../owner-presentation";
import type { AttentionItem } from "../owner-insights";
import type { BoatPerformance, OwnerBoat } from "../owner.types";

const CHIP_TONES = {
  success: "bg-success-soft/90 text-success ring-success/30",
  warning: "bg-warning-soft/90 text-warning ring-warning/30",
  info: "bg-info-soft/90 text-info ring-info/30",
  muted: "bg-background/70 text-foreground/80 ring-glass-border",
} as const;

/** The status chip over a boat photo, in the glass palette. */
export function StatusChip({ boat, className }: { boat: OwnerBoat; className?: string }) {
  const chip = listingChip(boat);
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset backdrop-blur-md",
        CHIP_TONES[chip.tone],
        className
      )}
    >
      {chip.label}
    </span>
  );
}

/** The owner's boats as photo cards: status, this year's numbers, next charter, any flags. */
export function FleetGrid({
  boats,
  performance,
  flags,
  showMoney,
}: {
  boats: OwnerBoat[];
  performance: BoatPerformance[];
  /** Attention items, for a per-boat flag count. */
  flags: AttentionItem[];
  /** Managers see hours instead of earnings. */
  showMoney: boolean;
}) {
  const byId = new Map(performance.map((p) => [p.boatId, p]));

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {boats.map((boat) => {
        const perf = byId.get(boat.id);
        const flagged = flags.filter((f) => f.id.startsWith(`${boat.id}:`) && f.tone !== "info");
        return (
          <li key={boat.id}>
            <Link
              href={ownerBoatHref(boat)}
              className="group glass-panel block overflow-hidden p-0 transition-[transform,filter] duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={boat.mainImage || TRIP_FALLBACK_IMAGE}
                  alt={boat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 420px"
                />
                <div className="absolute inset-0 bg-linear-to-t from-background/85 via-background/10 to-transparent" />
                <StatusChip boat={boat} className="absolute top-3 left-3" />
                {flagged.length > 0 ? (
                  <span className="absolute top-3 right-3 rounded-full bg-warning px-2.5 py-0.5 text-xs font-semibold text-black">
                    {flagged.length} to fix
                  </span>
                ) : null}
                <div className="absolute inset-x-4 bottom-3">
                  <h3 className="truncate text-lg font-semibold text-foreground">{boat.name}</h3>
                  <p className="truncate text-sm text-foreground/75">
                    {[
                      categoryLabel(boat.category),
                      `${boat.lengthFt} ft`,
                      `${boat.capacity} guests`,
                    ].join(" · ")}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-2 px-4 py-3.5 text-sm">
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {showMoney ? "This year" : "Hours this year"}
                  </dt>
                  <dd className="font-semibold text-foreground tabular-nums">
                    {showMoney
                      ? perf && perf.earningsCents > 0
                        ? formatCentsAsWholeDollars(perf.earningsCents)
                        : "—"
                      : (perf?.hours ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Charters</dt>
                  <dd className="font-semibold text-foreground tabular-nums">
                    {perf?.charters ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Next</dt>
                  <dd className="font-semibold text-foreground">
                    {perf?.nextCharter
                      ? formatBoatLocal(
                          perf.nextCharter.startsAt,
                          perf.nextCharter.timezone,
                          "MMM d"
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The overview's short version: one row per boat. */
export function FleetRows({
  boats,
  performance,
  showMoney,
}: {
  boats: OwnerBoat[];
  performance: BoatPerformance[];
  showMoney: boolean;
}) {
  const byId = new Map(performance.map((p) => [p.boatId, p]));
  return (
    <ul className="-mx-5 -mb-5 divide-y divide-glass-border border-t border-glass-border">
      {boats.map((boat) => {
        const perf = byId.get(boat.id);
        return (
          <li key={boat.id}>
            <Link
              href={ownerBoatHref(boat)}
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-glass-inset"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                <Image
                  src={boat.mainImage || TRIP_FALLBACK_IMAGE}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {boat.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {perf?.nextCharter
                    ? `Next: ${formatBoatLocal(perf.nextCharter.startsAt, perf.nextCharter.timezone, "EEE, MMM d")}`
                    : "No charters booked"}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <StatusChip boat={boat} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {showMoney
                    ? perf && perf.earningsCents > 0
                      ? `${formatCentsAsWholeDollars(perf.earningsCents)} this year`
                      : "No earnings yet"
                    : `${perf?.charters ?? 0} charters this year`}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
