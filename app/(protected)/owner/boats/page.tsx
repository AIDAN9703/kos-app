import Link from "next/link";
import { Plus } from "lucide-react";
import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { FleetGrid } from "@/features/owner-dashboard/components/FleetGrid";
import { NoBoatsYet } from "@/features/owner-dashboard/components/NoBoatsYet";
import { buildOwnerAnalytics } from "@/features/owner-dashboard/owner-analytics";
import { attentionItems } from "@/features/owner-dashboard/owner-insights";
import { getMyBoats, getMyCharters } from "@/features/owner-dashboard/owner.data";

export default async function OwnerBoatsPage() {
  await requireOwner();
  const [boats, charters] = await Promise.all([getMyBoats(), getMyCharters()]);
  const live = boats.filter((b) => b.active).length;
  const { byBoat } = buildOwnerAnalytics(charters, boats);

  return (
    <GlassPage>
      <GlassHeader
        title="My boats"
        meta={
          boats.length > 0 ? (
            <span>
              {boats.length} {boats.length === 1 ? "boat" : "boats"} · {live} live on kosyachts.com
            </span>
          ) : null
        }
        actions={
          <Link
            href="/list-your-boat/start"
            className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)] transition-[filter] hover:brightness-110"
          >
            <Plus aria-hidden className="size-4" />
            List a boat
          </Link>
        }
      />
      {boats.length === 0 ? (
        <NoBoatsYet />
      ) : (
        <FleetGrid boats={boats} performance={byBoat} flags={attentionItems(boats)} />
      )}
    </GlassPage>
  );
}
