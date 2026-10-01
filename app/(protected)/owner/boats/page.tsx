import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { FleetGrid } from "@/features/owner-dashboard/components/FleetGrid";
import { NoBoatsYet } from "@/features/owner-dashboard/components/NoBoatsYet";
import { buildOwnerAnalytics } from "@/features/owner-dashboard/owner-analytics";
import { getOwnerBoats, getOwnerCharters } from "@/features/owner-dashboard/owner.queries";

export default async function OwnerBoatsPage() {
  const session = await requireOwner();
  const [boats, charters] = await Promise.all([
    getOwnerBoats(session.user.id),
    getOwnerCharters(session.user.id),
  ]);
  const live = boats.filter((b) => b.active).length;
  const { byBoat } = buildOwnerAnalytics(charters, boats);

  return (
    <div className="space-y-5">
      <h1 className="sr-only">My boats</h1>
      {boats.length > 0 ? (
        <p className="text-sm text-slate-500">
          {boats.length} {boats.length === 1 ? "boat" : "boats"} · {live} live on kosyachts.com
        </p>
      ) : null}
      {boats.length === 0 ? <NoBoatsYet /> : <FleetGrid boats={boats} performance={byBoat} />}
    </div>
  );
}
