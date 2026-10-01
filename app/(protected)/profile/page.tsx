import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { ConciergeSection } from "@/features/profile/components/overview/ConciergeSection";
import { LoyaltyCard } from "@/features/profile/components/overview/LoyaltyCard";
import { MemberStats } from "@/features/profile/components/overview/MemberStats";
import { ProfileCompletion } from "@/features/profile/components/overview/ProfileCompletion";
import { TodoCards } from "@/features/profile/components/overview/TodoCards";
import { UpcomingSection } from "@/features/profile/components/overview/UpcomingSection";
import { summarizeLoyalty } from "@/features/profile/loyalty";
import { getAccount, getTrips } from "@/features/profile/profile.queries";
import { buildOverview, profileCompletion } from "@/features/profile/trip-presentation";

export default async function ProfileOverviewPage() {
  const session = await requireAuth();
  const [account, trips] = await Promise.all([
    getAccount(session.user.id),
    getTrips(session.user.id),
  ]);
  if (!account) redirect("/sign-in");

  const overview = buildOverview(trips);
  const loyalty = summarizeLoyalty(trips);
  const completion = profileCompletion(account);
  const profileIncomplete = completion.some((item) => !item.done);
  const hasPastTrips =
    overview.stats.tripsCompleted > 0 || trips.some((t) => t.status === "CANCELLED");

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Welcome back${account.firstName ? `, ${account.firstName}` : ""}`}
        action={
          <Button asChild className="rounded-full px-5">
            <Link href="/#request-to-book">Book a charter</Link>
          </Button>
        }
      />

      <div
        className={
          profileIncomplete ? "grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]" : ""
        }
      >
        <LoyaltyCard loyalty={loyalty} />
        <ProfileCompletion items={completion} />
      </div>

      <MemberStats stats={overview.stats} />

      <TodoCards items={overview.attention} />

      <UpcomingSection
        nextTrip={overview.nextTrip}
        moreUpcoming={overview.moreUpcoming}
        hasPastTrips={hasPastTrips}
      />

      <ConciergeSection />
    </div>
  );
}
