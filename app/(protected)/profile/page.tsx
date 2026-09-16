import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { getPublishedBlogPosts } from "@/features/blog/actions/admin-blog-actions";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { NextTripCard } from "@/features/profile/components/overview/NextTripCard";
import { ResourcesStrip } from "@/features/profile/components/overview/ResourcesStrip";
import { TodoCards } from "@/features/profile/components/overview/TodoCards";
import { PlanCharterCard } from "@/features/profile/components/trips/PlanCharterCard";
import { PastTripTile } from "@/features/profile/components/trips/PastTripTile";
import { UpcomingTripCard } from "@/features/profile/components/trips/UpcomingTripCard";
import { getAccount, getTrips } from "@/features/profile/profile.queries";
import { buildOverview, splitTrips } from "@/features/profile/trip-presentation";

export const dynamic = "force-dynamic";

export default async function ProfileOverviewPage() {
  const session = await requireAuth();
  const [account, trips, posts] = await Promise.all([
    getAccount(session.user.id),
    getTrips(session.user.id),
    getPublishedBlogPosts({ limit: 3 }),
  ]);
  if (!account) redirect("/sign-in");

  const overview = buildOverview(trips, account);
  const { upcoming } = splitTrips(trips);
  // Everything ahead except the one already shown as "your next trip".
  const moreUpcoming = upcoming.filter((t) => t.id !== overview.nextTrip?.id).slice(0, 3);
  const { counts } = overview;
  const summary =
    counts.upcoming === 0
      ? "Nothing on the calendar yet — let's find your next day on the water."
      : counts.upcoming === 1
        ? "You have one trip coming up."
        : `You have ${counts.upcoming} trips coming up.`;

  return (
    <div className="space-y-12">
      <PageHeader title={`Welcome back${account.firstName ? `, ${account.firstName}` : ""}`} description={summary} />

      <TodoCards items={overview.attention} />

      {overview.nextTrip ? <NextTripCard trip={overview.nextTrip} /> : null}

      {moreUpcoming.length > 0 ? (
        <section aria-labelledby="ahead-heading">
          <h2 id="ahead-heading" className="text-xl font-semibold tracking-tight text-primary">
            Upcoming trips
          </h2>
          <div className="mt-4 space-y-4">
            {moreUpcoming.map((trip) => (
              <UpcomingTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      ) : null}

      {overview.recentTrips.length > 0 ? (
        <section aria-labelledby="recent-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-heading" className="text-xl font-semibold tracking-tight text-primary">
              My trips
            </h2>
            <Link href="/profile/bookings" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
              All trips
            </Link>
          </div>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2">
            {overview.recentTrips.map((trip) => (
              <li key={trip.id}>
                <PastTripTile trip={trip} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PlanCharterCard
        title="Plan your next charter"
        body="Browse the fleet, pick a date, and we'll take care of the rest — captain, crew and all."
      />

      <ResourcesStrip posts={posts ?? []} />
    </div>
  );
}
