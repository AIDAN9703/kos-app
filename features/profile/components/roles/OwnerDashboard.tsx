import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils/general-utils";
import { guestsLabel, tripDate, tripTimeRange, TRIP_FALLBACK_IMAGE } from "../../trip-presentation";
import type { OwnedBoat, OwnerCharter } from "../../profile.types";

interface OwnerDashboardProps {
  boats: OwnedBoat[];
  charters: OwnerCharter[];
}

/** What an owner can see about their fleet: listings, and booked charters ahead. */
export function OwnerDashboard({ boats, charters }: OwnerDashboardProps) {
  const active = boats.filter((b) => b.active).length;

  if (boats.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-primary">No boats listed yet</h2>
        <p className="mt-2 max-w-lg text-[15px] leading-7 text-slate-600">
          Once the KOS team adds your boat to the fleet, it appears here with its listing status and
          upcoming charters. Want to get a boat on the water with us?
        </p>
        <Button asChild className="mt-5">
          <Link href="/services/charter-management">About charter management</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200">
        {[
          { label: "Boats", value: boats.length },
          { label: "Live listings", value: active },
          { label: "Charters ahead", value: charters.length },
        ].map((stat) => (
          <div key={stat.label} className="px-4 py-4 first:pl-0 last:pr-0 sm:px-6">
            <dd className="text-2xl font-bold tabular-nums text-primary sm:text-3xl">{stat.value}</dd>
            <dt className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      <section aria-labelledby="fleet-heading">
        <h2 id="fleet-heading" className="text-lg font-bold text-primary">
          Your fleet
        </h2>
        <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
          {boats.map((boat) => (
            <li key={boat.id} className="flex items-center gap-4 py-4">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image
                  src={boat.mainImage || TRIP_FALLBACK_IMAGE}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">{boat.displayTitle || boat.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {boat.category.toLowerCase().replace(/_/g, " ")} · up to {boat.capacity} guests
                  {boat.locationLabel ? ` · ${boat.locationLabel}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  boat.active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                )}
              >
                {boat.active ? "Live" : "Not listed"}
              </span>
              {boat.active ? (
                <Link
                  href={`/boats/${boat.id}`}
                  className="hidden shrink-0 text-sm font-semibold text-primary hover:underline sm:block"
                >
                  View listing
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="charters-heading">
        <h2 id="charters-heading" className="text-lg font-bold text-primary">
          Upcoming charters
        </h2>
        {charters.length === 0 ? (
          <p className="mt-2 text-[15px] leading-7 text-slate-600">
            Nothing booked on your boats right now. New bookings show up here as soon as they&apos;re confirmed.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
            {charters.map((charter) => (
              <li key={charter.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
                <p className="font-semibold text-primary">{charter.boatName}</p>
                <p className="text-sm text-slate-600">
                  {tripDate(charter)}
                  {tripTimeRange(charter) ? ` · ${tripTimeRange(charter)}` : ""} · {guestsLabel(charter.guests)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm leading-6 text-slate-500">
        Questions about payouts or your listing?{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          Contact the team
        </Link>
        .
      </p>
    </div>
  );
}
