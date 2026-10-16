import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { GlassHeader, GlassPage, GlassPanel } from "@/shared/admin/components/glass";
import { SegmentedNav } from "@/shared/admin/filters/SegmentedPills";
import { CharterList } from "@/features/owner-dashboard/components/CharterList";
import { splitCharters } from "@/features/owner-dashboard/owner-analytics";
import { getMyCharters, getMyOwnerView } from "@/features/owner-dashboard/owner.data";

const VIEWS = [
  {
    key: "upcoming",
    label: "Upcoming",
    empty:
      "Nothing booked on your boats right now. New charters show up here once they're confirmed.",
  },
  { key: "past", label: "Past", empty: "No completed charters yet." },
  { key: "cancelled", label: "Cancelled", empty: "No cancelled charters." },
] as const;

type View = (typeof VIEWS)[number]["key"];

const hrefFor = (key: View) =>
  key === "upcoming" ? "/owner/charters" : `/owner/charters?view=${key}`;

export default async function OwnerChartersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [, params, owner, charters] = await Promise.all([
    requireOwner(),
    searchParams,
    getMyOwnerView(),
    getMyCharters(),
  ]);
  const groups = splitCharters(charters);
  const view: View = VIEWS.some((v) => v.key === params.view) ? (params.view as View) : "upcoming";
  const current = VIEWS.find((v) => v.key === view)!;

  return (
    <GlassPage>
      <GlassHeader
        title="Charters"
        actions={
          <SegmentedNav
            label="Show"
            activeHref={hrefFor(view)}
            links={VIEWS.map((v) => ({
              href: hrefFor(v.key),
              label: `${v.label} · ${groups[v.key].length}`,
            }))}
          />
        }
      />
      <GlassPanel className="p-0">
        <CharterList charters={groups[view]} empty={current.empty} showMoney={owner.canSeeMoney} />
      </GlassPanel>
    </GlassPage>
  );
}
