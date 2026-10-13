import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { GlassPage, GlassPanel } from "@/shared/admin/components/glass";
import { ComingUp } from "@/features/owner-dashboard/components/ComingUp";
import { FleetRows } from "@/features/owner-dashboard/components/FleetGrid";
import { FourWeekOutlook } from "@/features/owner-dashboard/components/FourWeekOutlook";
import { NeedsAttention } from "@/features/owner-dashboard/components/NeedsAttention";
import { NoBoatsYet } from "@/features/owner-dashboard/components/NoBoatsYet";
import { OwnerHero } from "@/features/owner-dashboard/components/OwnerHero";
import { buildOwnerAnalytics } from "@/features/owner-dashboard/owner-analytics";
import { attentionItems, buildOutlook } from "@/features/owner-dashboard/owner-insights";
import {
  getMyBoats,
  getMyCharters,
  getMyOwnerIdentity,
} from "@/features/owner-dashboard/owner.data";

/**
 * The owner's home, time first (the Airbnb Today / Vrbo pattern): the hero
 * with the money that matters, what's coming up, anything that needs the
 * owner, then four weeks of availability. The full earnings history lives
 * on the Earnings tab.
 */
export default async function OwnerOverviewPage() {
  await requireOwner();
  const [identity, boats, charters] = await Promise.all([
    getMyOwnerIdentity(),
    getMyBoats(),
    getMyCharters(),
  ]);
  const firstName = identity.name.split(" ")[0];

  if (boats.length === 0) {
    return (
      <GlassPage>
        <NoBoatsYet />
      </GlassPage>
    );
  }

  const now = new Date();
  const { kpis, monthly, byBoat, upcoming } = buildOwnerAnalytics(charters, boats, now);
  const attention = attentionItems(boats, now);
  const outlook = buildOutlook(boats, charters, now);
  const photos = new Map(boats.map((b) => [b.id, b.mainImage]));
  const heroPhoto =
    boats.find((b) => b.active && b.mainImage)?.mainImage ??
    boats.find((b) => b.mainImage)?.mainImage ??
    null;

  return (
    <GlassPage>
      <div className="flex flex-col gap-4">
        <OwnerHero
          firstName={firstName}
          photo={heroPhoto}
          kpis={kpis}
          monthly={monthly}
          next={upcoming[0] ?? null}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <ComingUp charters={upcoming} photos={photos} className="xl:col-span-7" />
          <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
            {attention.length > 0 ? <NeedsAttention items={attention} /> : null}
            <GlassPanel
              title={boats.length === 1 ? "Your boat" : `Your boats (${boats.length})`}
              className="flex-1"
            >
              <FleetRows boats={boats} performance={byBoat} />
            </GlassPanel>
          </div>
        </div>

        <FourWeekOutlook {...outlook} />
      </div>
    </GlassPage>
  );
}
