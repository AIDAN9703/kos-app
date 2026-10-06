"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/database/db";
import {
  boatExternalCalendars,
  boatExternalCalendarEvents,
} from "@/database/schema";
import { syncExternalCalendar } from "@/features/availability/services/external-calendar-sync.service";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";

export type { ExternalCalendarListItem } from "./external-calendar.queries";

interface ActionResult {
  success: boolean;
  error?: string;
  /** Number of busy blocks imported (on add / sync-now). */
  eventCount?: number;
}

/** Normalize and validate an iCal URL. Converts webcal:// to https://. */
function normalizeIcalUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (url.toLowerCase().startsWith("webcal://")) {
    url = "https://" + url.slice("webcal://".length);
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function revalidateBoatCalendar(boatId: string) {
  revalidatePath(`/admin/boats/${boatId}/calendar`);
  revalidatePath(`/boats/${boatId}`);
}

export async function addExternalCalendar(
  boatId: string,
  input: { name: string; icalUrl: string }
): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  const name = input.name?.trim();
  if (!name) return { success: false, error: "Please give the calendar a name" };

  const icalUrl = normalizeIcalUrl(input.icalUrl);
  if (!icalUrl) {
    return { success: false, error: "Enter a valid iCal (https or webcal) URL" };
  }

  try {
    const [created] = await db
      .insert(boatExternalCalendars)
      .values({ boatId, name, icalUrl, lastSyncStatus: "PENDING" })
      .returning({ id: boatExternalCalendars.id });

    // Sync immediately so the admin sees results without waiting for cron.
    const result = await syncExternalCalendar(created.id);

    revalidateBoatCalendar(boatId);

    if (result.status === "ERROR") {
      return {
        success: true,
        error: `Calendar added, but the first sync failed: ${result.error}`,
      };
    }
    return { success: true, eventCount: result.eventCount };
  } catch (error) {
    console.error("Failed to add external calendar:", error);
    return { success: false, error: "Failed to add calendar" };
  }
}

export async function syncExternalCalendarNow(calendarId: string): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  const [calendar] = await db
    .select({ boatId: boatExternalCalendars.boatId })
    .from(boatExternalCalendars)
    .where(eq(boatExternalCalendars.id, calendarId))
    .limit(1);

  if (!calendar) return { success: false, error: "Calendar not found" };

  const result = await syncExternalCalendar(calendarId);
  revalidateBoatCalendar(calendar.boatId);

  if (result.status === "ERROR") {
    return { success: false, error: result.error };
  }
  return { success: true, eventCount: result.eventCount };
}

export async function setExternalCalendarEnabled(
  calendarId: string,
  enabled: boolean
): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  const [calendar] = await db
    .select({ boatId: boatExternalCalendars.boatId })
    .from(boatExternalCalendars)
    .where(eq(boatExternalCalendars.id, calendarId))
    .limit(1);

  if (!calendar) return { success: false, error: "Calendar not found" };

  try {
    await db
      .update(boatExternalCalendars)
      .set({ syncEnabled: enabled, updatedAt: new Date() })
      .where(eq(boatExternalCalendars.id, calendarId));

    if (enabled) {
      // Re-pull fresh blocks.
      await syncExternalCalendar(calendarId);
    } else {
      // Pausing should stop blocking immediately — drop imported events.
      await db
        .delete(boatExternalCalendarEvents)
        .where(eq(boatExternalCalendarEvents.externalCalendarId, calendarId));
      await db
        .update(boatExternalCalendars)
        .set({ lastEventCount: 0, updatedAt: new Date() })
        .where(eq(boatExternalCalendars.id, calendarId));
    }

    revalidateBoatCalendar(calendar.boatId);
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle external calendar:", error);
    return { success: false, error: "Failed to update calendar" };
  }
}

export async function removeExternalCalendar(calendarId: string): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (admin.error !== undefined) return { success: false, error: admin.error };

  const [calendar] = await db
    .select({ boatId: boatExternalCalendars.boatId })
    .from(boatExternalCalendars)
    .where(eq(boatExternalCalendars.id, calendarId))
    .limit(1);

  if (!calendar) return { success: false, error: "Calendar not found" };

  try {
    // Events cascade-delete via FK.
    await db
      .delete(boatExternalCalendars)
      .where(eq(boatExternalCalendars.id, calendarId));

    revalidateBoatCalendar(calendar.boatId);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove external calendar:", error);
    return { success: false, error: "Failed to remove calendar" };
  }
}
