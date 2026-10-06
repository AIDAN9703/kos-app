"use server";

import { eq } from "drizzle-orm";

import { db } from "@/database/db";
import { boatExternalCalendars } from "@/database/schema";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";

export interface ExternalCalendarListItem {
  id: string;
  name: string;
  icalUrl: string;
  syncEnabled: boolean;
  lastSyncedAt: Date | null;
  lastSyncStatus: "PENDING" | "SUCCESS" | "ERROR" | null;
  lastSyncError: string | null;
  lastEventCount: number | null;
}

/** Fetch external calendars for a boat (read-only — no node-ical dependency). */
export async function getBoatExternalCalendars(
  boatId: string
): Promise<ExternalCalendarListItem[]> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return [];

  return db
    .select({
      id: boatExternalCalendars.id,
      name: boatExternalCalendars.name,
      icalUrl: boatExternalCalendars.icalUrl,
      syncEnabled: boatExternalCalendars.syncEnabled,
      lastSyncedAt: boatExternalCalendars.lastSyncedAt,
      lastSyncStatus: boatExternalCalendars.lastSyncStatus,
      lastSyncError: boatExternalCalendars.lastSyncError,
      lastEventCount: boatExternalCalendars.lastEventCount,
    })
    .from(boatExternalCalendars)
    .where(eq(boatExternalCalendars.boatId, boatId));
}
