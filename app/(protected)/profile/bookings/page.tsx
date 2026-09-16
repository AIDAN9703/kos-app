import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { PlanCharterCard } from "@/features/profile/components/trips/PlanCharterCard";
import { PastTripTile } from "@/features/profile/components/trips/PastTripTile";
import { UpcomingTripCard } from "@/features/profile/components/trips/UpcomingTripCard";
import { getTrips } from "@/features/profile/profile.queries";
import { splitTrips } from "@/features/profile/trip-presentation";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const session = await requireAuth();
  const trips = await getTrips(session.user.id);
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
        <PlanCharterCard
          title="No trips yet"
          body="Once you book a charter — or we send you a proposal — it shows up here with every detail in one place."
        />
      ) : (
        <>
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="text-xl font-semibold tracking-tight text-primary">
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-[15px] leading-7 text-slate-500">Nothing booked ahead right now.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {upcoming.map((trip) => (
                  <UpcomingTripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section aria-labelledby="past-heading">
              <h2 id="past-heading" className="text-xl font-semibold tracking-tight text-primary">
                Past
              </h2>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2">
                {past.map((trip) => (
                  <li key={trip.id}>
                    <PastTripTile trip={trip} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
