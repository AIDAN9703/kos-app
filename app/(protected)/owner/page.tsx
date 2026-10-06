import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { ArrowLink } from "@/features/profile/components/ArrowLink";
import { PageHeader } from "@/features/profile/components/PageHeader";
import { Section } from "@/features/profile/components/Section";
import { ActivityChart } from "@/features/owner-dashboard/components/ActivityChart";
import { CharterList } from "@/features/owner-dashboard/components/CharterList";
import { FleetTable } from "@/features/owner-dashboard/components/FleetTable";
import { NoBoatsYet } from "@/features/owner-dashboard/components/NoBoatsYet";
import { OwnerKpis } from "@/features/owner-dashboard/components/OwnerKpis";
import { buildOwnerAnalytics } from "@/features/owner-dashboard/owner-analytics";
import {
  getMyBoats,
  getMyCharters,
  getMyOwnerIdentity,
} from "@/features/owner-dashboard/owner.data";

/** Boats shown in the overview table before linking to the full list. */
const TOP_BOATS = 5;

export default async function OwnerOverviewPage() {
  await requireOwner();
  const [identity, boats, charters] = await Promise.all([
    getMyOwnerIdentity(),
    getMyBoats(),
    getMyCharters(),
  ]);
  const title = `Welcome back, ${identity.name.split(" ")[0]}`;

  if (boats.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title={title} />
        <NoBoatsYet />
      </div>
    );
  }

  const now = new Date();
  const { kpis, monthly, byBoat, upcoming } = buildOwnerAnalytics(charters, boats, now);

  return (
    <div className="space-y-10">
      <PageHeader title={title} />

      <OwnerKpis kpis={kpis} year={now.getFullYear()} />

      <ActivityChart monthly={monthly} />

      <Section
        id="upcoming-charters"
        title="Upcoming charters"
        action={<ArrowLink href="/owner/charters">View all</ArrowLink>}
      >
        <CharterList
          charters={upcoming.slice(0, 5)}
          empty="Nothing booked on your boats right now. New charters show up here once they're confirmed."
        />
      </Section>

      <Section
        id="boats"
        title={`Your boats in ${now.getFullYear()}`}
        action={
          boats.length > TOP_BOATS ? <ArrowLink href="/owner/boats">View all</ArrowLink> : null
        }
      >
        <FleetTable rows={byBoat.slice(0, TOP_BOATS)} />
      </Section>
    </div>
  );
}
