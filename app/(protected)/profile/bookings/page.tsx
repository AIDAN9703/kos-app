import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { Section } from "@/features/profile/components/Section";
import { EmptyTripsCard } from "@/features/profile/components/trips/EmptyTripsCard";
import { PastTripTile } from "@/features/profile/components/trips/PastTripTile";
import { UpcomingTripCard } from "@/features/profile/components/trips/UpcomingTripCard";
import { getMyTrips } from "@/features/profile/profile.data";
import { splitTrips } from "@/features/profile/trip-presentation";

export default async function TripsPage() {
  await requireAuth();
  const trips = await getMyTrips();
  const { upcoming, past } = splitTrips(trips);

  return (
    <div className="space-y-12">
      <PageHeader
        title="My trips"
        description={
          trips.length === 0
            ? "Every charter you book with KOS lives here."
            : `${trips.length} ${trips.length === 1 ? "trip" : "trips"} with KOS so far.`
        }
      />

      {trips.length === 0 ? (
        <EmptyTripsCard />
      ) : (
        <>
          <Section id="upcoming" title="Upcoming">
            {upcoming.length === 0 ? (
              <p className="text-[15px] leading-7 text-slate-500">
                Nothing booked ahead right now.
              </p>
            ) : (
              upcoming.map((trip) => <UpcomingTripCard key={trip.id} trip={trip} />)
            )}
          </Section>

          {past.length > 0 ? (
            <Section id="past" title="Past">
              <ul className="grid gap-5 sm:grid-cols-2">
                {past.map((trip) => (
                  <li key={trip.id}>
                    <PastTripTile trip={trip} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
