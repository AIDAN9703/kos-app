import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { surfaceInteractive } from "@/features/profile/components/surface";
import { TRIP_FALLBACK_IMAGE } from "@/features/profile/trip-presentation";
import { categoryLabel } from "../owner-presentation";
import type { BoatPerformance, OwnerBoat } from "../owner.types";

/** The owner's boats as photo cards with this year's numbers. */
export function FleetGrid({
  boats,
  performance,
}: {
  boats: OwnerBoat[];
  performance: BoatPerformance[];
}) {
  const byId = new Map(performance.map((p) => [p.boatId, p]));

  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {boats.map((boat) => {
        const perf = byId.get(boat.id);
        return (
          <li key={boat.id}>
            <Link
              href={`/owner/boats/${boat.id}`}
              className={`group block overflow-hidden ${surfaceInteractive}`}
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <Image
                  src={boat.mainImage || TRIP_FALLBACK_IMAGE}
                  alt={boat.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 380px"
                />
                <span
                  className={cn(
                    "absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm",
                    boat.active ? "bg-success-soft text-success" : "bg-white text-slate-500"
                  )}
                >
                  {boat.active ? "Live" : "Not listed"}
                </span>
              </div>
              <div className="p-5">
                <h3 className="truncate text-lg font-semibold text-primary group-hover:underline">
                  {boat.name}
                </h3>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {[
                    categoryLabel(boat.category),
                    `${boat.lengthFt} ft`,
                    `${boat.capacity} guests`,
                  ].join(" · ")}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Charters</dt>
                    <dd className="font-semibold text-primary tabular-nums">
                      {perf?.charters ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Payout</dt>
                    <dd className="font-semibold text-primary tabular-nums">
                      {perf && perf.earningsCents > 0
                        ? formatCentsAsWholeDollars(perf.earningsCents)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Next charter</dt>
                    <dd className="font-semibold text-primary">
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
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
