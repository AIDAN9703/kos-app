import { getBoatTiers } from "@/features/boats/boat.data";
import {
  getAdminWorkload,
  getFleetLeaders,
  getLeadIntake,
  getRecentActivity,
  getRevenueTrend,
  getUpcomingTrips,
} from "@/features/admin/dashboard.data";
import { AdminDashboardView } from "@/features/admin/dashboard/AdminDashboardView";
import { getSession } from "@/shared/lib/utils/auth-utils";

export default async function AdminDashboardPage() {
  const session = await getSession();
  const firstName = session?.user?.name?.split(/\s+/)[0] ?? null;

  const [
    upcomingTrips,
    pricingTiers,
    trend,
    intake,
    leaders,
    workload,
    activity,
  ] = await Promise.all([
    getUpcomingTrips(30),
    getBoatTiers(),
    getRevenueTrend(12),
    getLeadIntake(30),
    getFleetLeaders(5),
    getAdminWorkload(),
    getRecentActivity(20),
  ]);

  return (
    <AdminDashboardView
      firstName={firstName}
      pricingTiers={pricingTiers}
      upcomingTrips={upcomingTrips}
      trend={trend}
      intake={intake}
      leaders={leaders}
      workload={workload}
      activity={activity}
    />
  );
}
