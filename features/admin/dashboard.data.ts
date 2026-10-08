import "server-only";

import * as dashboard from "@/features/admin/dashboard.service";
import type { Notifications } from "@/features/admin/dashboard.types";
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

export async function getRecentActivity(limit?: number) {
  await assertDashboard();
  return dashboard.getRecentActivity(limit);
}

export async function getActionQueue() {
  await assertDashboard();
  return dashboard.getActionQueue();
}

/** The bell in the top bar: how much is waiting, and the most urgent few. */
export async function getNotifications(limit = 8): Promise<Notifications> {
  await assertDashboard();
  const items = await dashboard.getActionQueue();
  return { total: items.length, urgent: items.filter((i) => i.severity === 3).length, items: items.slice(0, limit) };
}

export async function getDeskNumbers() {
  await assertDashboard();
  return dashboard.getDeskNumbers();
}
