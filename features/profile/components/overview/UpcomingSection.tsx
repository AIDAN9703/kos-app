import { CalendarDays } from "lucide-react";
import type { TripSummary } from "../../profile.types";
import { ArrowLink } from "../ArrowLink";
import { Section } from "../Section";
import { surface } from "../surface";
import { UpcomingTripCard } from "../trips/UpcomingTripCard";
import { NextTripCard } from "./NextTripCard";

interface UpcomingSectionProps {
  nextTrip: TripSummary | null;
  moreUpcoming: TripSummary[];
  hasPastTrips: boolean;
}

/**
 * What's ahead: the next booked trip as a hero, then anything else upcoming
 * (proposals, inquiries, later trips). "View all" opens My trips; the empty
 * state also offers a direct link to past trips.
 */
export function UpcomingSection({ nextTrip, moreUpcoming, hasPastTrips }: UpcomingSectionProps) {
  const isEmpty = !nextTrip && moreUpcoming.length === 0;

  return (
    <Section
      id="upcoming-trips"
      title="Upcoming trips"
      action={<ArrowLink href="/profile/bookings">View all</ArrowLink>}
    >
      {isEmpty ? (
        <div
          className={`flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between ${surface}`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="h-5 w-5 text-slate-500" />
            </span>
            <div>
              <p className="font-semibold text-primary">Nothing on the calendar yet</p>
              <p className="text-sm text-slate-500">
                Your next day on the water will show up here.
              </p>
            </div>
          </div>
          {hasPastTrips ? (
            <ArrowLink href="/profile/bookings#past">View past trips</ArrowLink>
          ) : null}
        </div>
      ) : (
        <>
          {nextTrip ? <NextTripCard trip={nextTrip} /> : null}
          {moreUpcoming.map((trip) => (
            <UpcomingTripCard key={trip.id} trip={trip} />
          ))}
        </>
      )}
    </Section>
  );
}
