import { getBoatTiers } from "@/features/boats/boat.data";
import {
  getActionQueue,
  getDeskNumbers,
  getRecentActivity,
  getRevenueTrend,
} from "@/features/admin/dashboard.data";
import { listCalendarDeals } from "@/features/bookings/deal.data";
import { gridQueryRange, weekGridDays } from "@/features/bookings/lib/calendar-month";
import { DeskHero } from "@/features/admin/dashboard/DeskHero";
import { ActionQueue } from "@/features/admin/dashboard/ActionQueue";
import { DeskCalendar } from "@/features/admin/dashboard/DeskCalendar";
import { ActivityLog } from "@/features/admin/dashboard/ActivityLog";
import { GlassPage } from "@/shared/admin/components/glass";
import { getSession } from "@/shared/lib/utils/auth-utils";

/** Each block rises in on load, one after another. */
const rise = "animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500";

/**
 * The desk: greeting and headline numbers over the fleet photo; below, this
 * week and next as a calendar and what needs a person on the left, with
 * activity running the full height on the right.
 */
export default async function AdminDashboardPage() {
  // This week and next, for the calendar.
  const days = weekGridDays(new Date(), 2);
  const range = gridQueryRange(days);
  const [session, pricingTiers, numbers, trend, actions, calendarDeals, activity] = await Promise.all([
    getSession(),
    getBoatTiers(),
    getDeskNumbers(),
    getRevenueTrend(12),
    getActionQueue(),
    listCalendarDeals({ archivedView: false }, range.from, range.to),
    getRecentActivity(60),
  ]);
  const firstName = session?.user?.name?.split(/\s+/)[0] ?? null;

  return (
    <GlassPage compact>
      <div className="flex w-full flex-col gap-5 pb-10">
        <div className={rise}>
          <DeskHero firstName={firstName} pricingTiers={pricingTiers} trend={trend} numbers={numbers} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className={`${rise} delay-100`}>
              <DeskCalendar
                days={days}
                deals={calendarDeals}
                conflictIds={actions.flatMap((a) => (a.kind === "conflict" && a.bookingId ? [a.bookingId] : []))}
              />
            </div>
            <div className={`${rise} delay-200`}>
              <ActionQueue items={actions} />
            </div>
          </div>

          {/* Pinned to the left column's height on wide screens, scrolling inside. */}
          <div className={`${rise} relative min-h-[420px] delay-150`}>
            <ActivityLog items={activity} className="xl:absolute xl:inset-0" />
          </div>
        </div>
      </div>
    </GlassPage>
  );
}
