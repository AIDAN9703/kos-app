import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import {
  TRIP_FALLBACK_IMAGE,
  guestsLabel,
  relativeDeparture,
  tripDate,
  tripDurationHours,
  tripTimeRange,
} from "../../trip-presentation";
import type { TripSummary } from "../../profile.types";
import { surface } from "../surface";
import { TripStatusBadge } from "../trips/TripStatusBadge";

/** The soonest booked trip — a big photo with the essentials, first thing on the overview. */
export function NextTripCard({ trip }: { trip: TripSummary }) {
  const countdown = relativeDeparture(trip);
  const hours = tripDurationHours(trip);
  const time = tripTimeRange(trip);

  return (
    <section aria-labelledby="next-trip-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="next-trip-heading" className="text-xl font-semibold tracking-tight text-primary">
          Your next trip
        </h2>
        {countdown ? <p className="text-sm font-semibold text-primary">{countdown}</p> : null}
      </div>

      <div className={`mt-4 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] ${surface}`}>
        <Link
          href={`/profile/bookings/${trip.id}`}
          aria-label={`${trip.boatName} — open trip`}
          className="relative block aspect-[16/10] lg:aspect-auto lg:min-h-[320px]"
        >
          <Image
            src={trip.boatImage || TRIP_FALLBACK_IMAGE}
            alt={trip.boatName}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 520px"
          />
        </Link>

        <div className="flex flex-col p-6 sm:p-7 lg:p-8">
          <TripStatusBadge trip={trip} className="self-start" />
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-primary sm:text-[28px]">{trip.boatName}</h3>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-[15px]">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Date</dt>
              <dd className="mt-0.5 text-slate-800">{tripDate(trip)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Time</dt>
              <dd className="mt-0.5 text-slate-800">
                {time || "To be confirmed"}
                {hours ? <span className="text-slate-500"> · {hours}h</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Guests</dt>
              <dd className="mt-0.5 text-slate-800">
                {guestsLabel(trip.guests)}
                {trip.needsCaptain ? <span className="text-slate-500"> · Captain included</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Pickup</dt>
              <dd className="mt-0.5 text-slate-800">{trip.pickupLocation ?? "To be confirmed"}</dd>
            </div>
          </dl>

          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5 lg:pt-6">
            <Button asChild>
              <Link href={`/profile/bookings/${trip.id}`}>View trip</Link>
            </Button>
            {trip.boatId ? (
              <Button asChild variant="ghost" className="text-primary">
                <Link href={`/boats/${trip.boatId}`}>View boat</Link>
              </Button>
            ) : null}
            {trip.balanceCents > 0 ? (
              <p className="ml-auto text-sm text-slate-500">
                Balance{" "}
                <span className="font-semibold tabular-nums text-primary">{formatCentsAsCurrency(trip.balanceCents)}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
