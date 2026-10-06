"use server";

import { revalidatePath } from "next/cache";

import * as availability from "@/features/availability/availability.data";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * A boat's external (iCal) calendars (admins). Thin wrappers over
 * availability.data.ts.
 */

type Synced = ActionResponse<{ eventCount?: number }>;

function revalidateBoatCalendar(boatId: string) {
  revalidatePath(`/admin/boats/${boatId}/calendar`);
  revalidatePath(`/boats/${boatId}`);
}

export async function addExternalCalendar(boatId: string, input: { name: string; icalUrl: string }): Promise<Synced> {
  try {
    const { eventCount, syncError } = await availability.addExternalCalendar(boatId, input);
    revalidateBoatCalendar(boatId);
    // Added either way; a failed first sync is reported alongside.
    return syncError
      ? { success: true, data: {}, error: `Calendar added, but the first sync failed: ${syncError}` }
      : { success: true, data: { eventCount } };
  } catch (error) {
    return actionError(error, "Failed to add calendar");
  }
}

export async function syncExternalCalendarNow(calendarId: string): Promise<Synced> {
  try {
    const { boatId, eventCount } = await availability.syncExternalCalendarNow(calendarId);
    revalidateBoatCalendar(boatId);
    return { success: true, data: { eventCount } };
  } catch (error) {
    return actionError(error, "Failed to sync calendar");
  }
}

export async function setExternalCalendarEnabled(calendarId: string, enabled: boolean): Promise<Synced> {
  try {
    revalidateBoatCalendar(await availability.setExternalCalendarEnabled(calendarId, enabled));
    return { success: true, data: {} };
  } catch (error) {
    return actionError(error, "Failed to update calendar");
  }
}

export async function removeExternalCalendar(calendarId: string): Promise<Synced> {
  try {
    revalidateBoatCalendar(await availability.removeExternalCalendar(calendarId));
    return { success: true, data: {} };
  } catch (error) {
    return actionError(error, "Failed to remove calendar");
  }
}
