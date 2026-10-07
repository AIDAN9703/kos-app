import { getBoatTiers } from "@/features/boats/boat.data";
import {
  getActionQueue,
  getDeskNumbers,
  getFleetTimeline,
  getRecentActivity,
  getRevenueTrend,
} from "@/features/admin/dashboard.data";
import { DeskToolbar } from "@/features/admin/dashboard/DeskToolbar";
import { NumbersStrip } from "@/features/admin/dashboard/NumbersStrip";
import { ActionQueue } from "@/features/admin/dashboard/ActionQueue";
import { FleetTimeline } from "@/features/admin/dashboard/FleetTimeline";
import { ActivityLog } from "@/features/admin/dashboard/ActivityLog";
import { getSession } from "@/shared/lib/utils/auth-utils";

/**
 * The desk: greeting and numbers across the top; below, what needs a person
 * and the fleet's calendar on the left, with activity running the full
 * height on the right.
 */
export default async function AdminDashboardPage() {
  const [session, pricingTiers, numbers, trend, actions, timeline, activity] = await Promise.all([
    getSession(),
    getBoatTiers(),
    getDeskNumbers(),
    getRevenueTrend(12),
    getActionQueue(),
    getFleetTimeline(14),
    getRecentActivity(80),
  ]);
  const firstName = session?.user?.name?.split(/\s+/)[0] ?? null;

  return (
    <div className="flex w-full flex-col gap-5 pb-16">
      <DeskToolbar firstName={firstName} pricingTiers={pricingTiers} />
      <NumbersStrip trend={trend} numbers={numbers} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ActionQueue items={actions} />
          <FleetTimeline
            boats={timeline}
            conflictIds={actions.flatMap((a) => (a.kind === "conflict" && a.bookingId ? [a.bookingId] : []))}
          />
        </div>

        {/* Pinned to the left column's height on wide screens, scrolling inside. */}
        <div className="relative min-h-[420px]">
          <ActivityLog items={activity} className="xl:absolute xl:inset-0" />
        </div>
      </div>
    </div>
  );
}
