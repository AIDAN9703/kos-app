"use client";

import { format } from "date-fns";

import { NewBookingModal } from "@/features/bookings/components/admin/new-booking-modal";
import type { PricingTierOption } from "@/features/bookings/components/admin/booking-forms/types";
import type {
  ActivityItem,
  AdminWorkload,
  FleetLeader,
  LeadIntake as LeadIntakeData,
  RevenueMonth,
} from "@/features/admin/dashboard.types";
import type { BookingListItem } from "@/features/bookings/booking.types";

import { HeroBand } from "./HeroBand";
import { DeparturesRail } from "./DeparturesRail";
import { LeadIntake } from "./LeadIntake";
import { FleetLeaders } from "./FleetLeaders";
import { TeamWorkload } from "./TeamWorkload";
import { ActivityFeed } from "./ActivityFeed";

interface AdminDashboardViewProps {
  firstName: string | null;
  pricingTiers: PricingTierOption[];
  upcomingTrips: BookingListItem[];
  trend: RevenueMonth[];
  intake: LeadIntakeData;
  leaders: FleetLeader[];
  workload: AdminWorkload[];
  activity: ActivityItem[];
}

/**
 * The bridge. Under the instrument panel, a two-column grid: data on the
 * left (departures, lead intake, then fleet | desk), the activity feed
 * running the full right side. Rows stretch so boxes in a row share a
 * height — no ragged gaps. Every section is its own file; this is
 * composition only.
 */
export function AdminDashboardView({
  firstName,
  pricingTiers,
  upcomingTrips,
  trend,
  intake,
  leaders,
  workload,
  activity,
}: AdminDashboardViewProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const thisMonth = trend[trend.length - 1];

  return (
    <div className="flex w-full flex-1 flex-col gap-6 pb-16">
      {thisMonth ? (
        <HeroBand
          greeting={greeting}
          firstName={firstName}
          dateLabel={format(new Date(), "EEEE, MMMM d")}
          trend={trend}
          upcomingTrips={upcomingTrips}
          action={
            <NewBookingModal
              pricingTiers={pricingTiers}
              canLinkAccounts
              triggerLabel="New booking"
              triggerClassName="h-10 gap-1.5 rounded-full px-5 text-sm font-semibold shadow-[0_0_20px_-8px_var(--color-primary)]"
            />
          }
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        {/* Left: the data, stacked */}
        <div className="grid grid-cols-1 gap-6">
          <DeparturesRail trips={upcomingTrips} />
          <LeadIntake intake={intake} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {thisMonth ? <FleetLeaders leaders={leaders} monthName={thisMonth.monthName} /> : null}
            <TeamWorkload workload={workload} />
          </div>
        </div>

        {/* Right: the pulse, full height */}
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
