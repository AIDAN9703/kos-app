import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import {
  TRIP_FALLBACK_IMAGE,
  guestsLabel,
  relativeDeparture,
  tripDate,
  tripTimeRange,
} from "../../trip-presentation";
import type { TripSummary } from "../../profile.types";
import { surfaceInteractive } from "../surface";
import { TripStatusBadge } from "./TripStatusBadge";

/**
 * Reservation-style card for a trip that hasn't happened yet: details on the
 * left, photo on the right (photo on top on phones). One primary action.
 */
export function UpcomingTripCard({ trip }: { trip: TripSummary }) {
  const countdown = relativeDeparture(trip);
  const time = tripTimeRange(trip);
  const action =
    trip.status === "PROPOSED" && trip.publicToken
      ? { label: "Review proposal", href: `/bookings/proposal/${trip.publicToken}` }
      : trip.status === "BOOKED" && trip.paidCents === 0 && trip.totalCents > 0
        ? { label: "Pay to confirm", href: `/profile/bookings/${trip.id}` }
        : { label: "Trip details", href: `/profile/bookings/${trip.id}` };

  return (
    <article className={`group overflow-hidden sm:flex sm:flex-row-reverse ${surfaceInteractive}`}>
      <Link
        href={`/profile/bookings/${trip.id}`}
        aria-label={`${trip.boatName} — open trip`}
        className="relative block aspect-[16/10] overflow-hidden sm:aspect-auto sm:w-[38%] sm:shrink-0"
      >
        <Image
          src={trip.boatImage || TRIP_FALLBACK_IMAGE}
          alt={trip.boatName}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, 360px"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2">
          {countdown ? <span className="text-sm font-semibold text-primary">{countdown}</span> : null}
          <TripStatusBadge trip={trip} />
        </div>

        <h3 className="mt-2 text-xl font-semibold tracking-tight text-primary">
          <Link href={`/profile/bookings/${trip.id}`} className="hover:underline">
            {trip.boatName}
          </Link>
        </h3>

        <div className="mt-3 flex flex-col gap-y-1 text-[15px] text-slate-700 sm:flex-row sm:items-center sm:gap-x-3">
          <span>{tripDate(trip)}</span>
          {time ? (
            <>
              <span aria-hidden className="hidden h-4 w-px bg-gray-300 sm:block" />
              <span>{time}</span>
            </>
          ) : null}
        </div>
        <p className="mt-1 text-[15px] text-slate-500">
          {guestsLabel(trip.guests)}
          {trip.pickupLocation ? ` · ${trip.pickupLocation}` : ""}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          {trip.totalCents > 0 ? (
            <p className="text-sm text-slate-500">
              <span className="font-semibold tabular-nums text-primary">{formatCentsAsCurrency(trip.totalCents)}</span>
              {trip.balanceCents > 0 && trip.paidCents > 0
                ? ` · ${formatCentsAsCurrency(trip.balanceCents)} remaining`
                : trip.balanceCents === 0
                  ? " · paid"
                  : ""}
            </p>
          ) : (
            <span />
          )}
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {action.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
