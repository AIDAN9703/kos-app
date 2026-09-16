import Image from "next/image";
import Link from "next/link";
import { TRIP_FALLBACK_IMAGE, tripDate } from "../../trip-presentation";
import type { TripSummary } from "../../profile.types";
import { surfaceInteractive } from "../surface";
import { TripStatusBadge } from "./TripStatusBadge";

/** Compact past-trip card: square photo, name, date, status when it matters. */
export function PastTripTile({ trip }: { trip: TripSummary }) {
  return (
    <Link href={`/profile/bookings/${trip.id}`} className={`group flex items-center gap-4 p-3 ${surfaceInteractive}`}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
        <Image
          src={trip.boatImage || TRIP_FALLBACK_IMAGE}
          alt=""
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          sizes="96px"
        />
      </div>
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 font-semibold leading-snug text-primary group-hover:underline">{trip.boatName}</p>
        <p className="mt-0.5 text-sm text-slate-500">{tripDate(trip)}</p>
        <TripStatusBadge trip={trip} className="mt-2" />
      </div>
    </Link>
  );
}
