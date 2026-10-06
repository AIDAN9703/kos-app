import "server-only";

import * as dashboard from "@/features/admin/dashboard.service";
import { assertCan } from "@/shared/lib/utils/auth-utils";

/**
 * Admin dashboard data layer: company-wide trips, revenue, leads and team
 * workload. Every figure needs every deal and the company's economics
 * (booking:view-all + view-economics).
 */

async function assertDashboard() {
  await assertCan({ booking: ["view-all", "view-economics"] });
}

export async function getUnassignedLeads(limit?: number) {
  await assertDashboard();
  return dashboard.getUnassignedLeads(limit);
}

export async function getUpcomingTrips(daysAhead?: number) {
  await assertDashboard();
  return dashboard.getUpcomingTrips(daysAhead);
}

export async function getRevenueTrend(months?: number) {
  await assertDashboard();
  return dashboard.getRevenueTrend(months);
}

export async function getFleetLeaders(limit?: number) {
  await assertDashboard();
  return dashboard.getFleetLeaders(limit);
}

export async function getLeadIntake(days?: number) {
  await assertDashboard();
  return dashboard.getLeadIntake(days);
}

export async function getAdminWorkload() {
  await assertDashboard();
  return dashboard.getAdminWorkload();
}

export async function getRecentActivity(limit?: number) {
  await assertDashboard();
  return dashboard.getRecentActivity(limit);
}
