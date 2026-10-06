import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/database/db";
import { boatExternalCalendarEvents, boatExternalCalendars } from "@/database/schema";
import type { ExternalCalendarListItem } from "@/features/availability/availability.types";

/**
 * A boat's subscribed external (iCal) calendars. Fetching and importing their
 * events lives in external-calendar-sync.service.ts. Server-only and not
 * access-checked: availability.data.ts checks the admin first.
 */

export async function listForBoat(boatId: string): Promise<ExternalCalendarListItem[]> {
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

export async function create(boatId: string, name: string, icalUrl: string): Promise<{ id: string }> {
  const [created] = await db
    .insert(boatExternalCalendars)
    .values({ boatId, name, icalUrl, lastSyncStatus: "PENDING" })
    .returning({ id: boatExternalCalendars.id });
  return created;
}

/** The boat a calendar belongs to, or null when there's no such calendar. */
export async function getBoatId(calendarId: string): Promise<string | null> {
  const [row] = await db
    .select({ boatId: boatExternalCalendars.boatId })
    .from(boatExternalCalendars)
    .where(eq(boatExternalCalendars.id, calendarId))
    .limit(1);
  return row?.boatId ?? null;
}

export async function setEnabled(calendarId: string, enabled: boolean): Promise<void> {
  await db
    .update(boatExternalCalendars)
    .set({ syncEnabled: enabled, updatedAt: new Date() })
    .where(eq(boatExternalCalendars.id, calendarId));
}

/** Drop a calendar's imported events, so a paused calendar stops blocking at once. */
export async function clearEvents(calendarId: string): Promise<void> {
  await db
    .delete(boatExternalCalendarEvents)
    .where(eq(boatExternalCalendarEvents.externalCalendarId, calendarId));
  await db
    .update(boatExternalCalendars)
    .set({ lastEventCount: 0, updatedAt: new Date() })
    .where(eq(boatExternalCalendars.id, calendarId));
}

/** Remove the subscription; its events cascade-delete. */
export async function remove(calendarId: string): Promise<void> {
  await db.delete(boatExternalCalendars).where(eq(boatExternalCalendars.id, calendarId));
}
