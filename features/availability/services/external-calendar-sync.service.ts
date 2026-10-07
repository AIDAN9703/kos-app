import "server-only";

import type { VEvent, ParameterValue } from "node-ical";
import { eq } from "drizzle-orm";
import { fromZonedTime } from "date-fns-tz";

import { db } from "@/database/db";
import {
  boats,
  boatExternalCalendars,
  boatExternalCalendarEvents,
} from "@/database/schema";
import { getBoatTimezone } from "@/shared/lib/utils/date-helpers";

/**
 * External (iCal) calendar import.
 *
 * We poll each boat's subscribed iCal feed (e.g. a Google Calendar "secret
 * address in iCal format"), expand its events into concrete busy blocks within
 * a forward window, and store them in `boat_external_calendar_event`. The
 * availability service then treats those blocks as conflicts, so the public
 * booking calendar never offers a slot the owner already has taken elsewhere.
 *
 * Design notes:
 * - Fetch + parse happen BEFORE we touch the DB. If either fails we keep the
 *   previously-imported events (failing "closed" — still blocking) and only
 *   record the error. This avoids briefly freeing up slots on a transient
 *   network blip.
 * - On success we replace the full event set for that calendar (delete + insert)
 *   so cancellations/edits upstream never leave stale blocks behind.
 */

/** Import window: a little behind (for in-progress trips) and a year ahead. */
const SYNC_LOOKBACK_DAYS = 1;
const SYNC_LOOKAHEAD_DAYS = 365;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_EVENTS_PER_CALENDAR = 5_000;

interface ParsedBusyEvent {
  uid: string | null;
  summary: string | null;
  start: Date;
  end: Date;
}

type SyncResult =
  | { status: "SUCCESS"; eventCount: number }
  | { status: "ERROR"; eventCount: 0; error: string };

function syncWindow(now: Date = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(now.getTime() - SYNC_LOOKBACK_DAYS * 86_400_000),
    end: new Date(now.getTime() + SYNC_LOOKAHEAD_DAYS * 86_400_000),
  };
}

/** node-ical returns either a plain string or `{ val, params }` for text props. */
function paramValueToString(value: ParameterValue | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return typeof value.val === "string" ? value.val : null;
}

function clampEnd(start: Date, end: Date | undefined): Date {
  // Treat missing/invalid end as a 1-hour block; never allow end <= start.
  if (!end || end.getTime() <= start.getTime()) {
    return new Date(start.getTime() + 60 * 60 * 1000);
  }
  return end;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * All-day iCal events (VALUE=DATE) carry no time or timezone — node-ical
 * hands back midnight in the SERVER's zone, which on a UTC host would start
 * an "all day Saturday" block at 8pm Friday Miami time and leave Saturday
 * evening unprotected. Rebuild the block from the event's calendar date in
 * the BOAT's timezone instead: local midnight → local midnight.
 * (iCal DTEND on all-day events is exclusive — the morning after.)
 */
function allDayBounds(
  start: Date,
  end: Date | undefined,
  timezone: string
): { start: Date; end: Date } {
  const dayStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  const startUTC = fromZonedTime(`${dayStr(start)} 00:00:00`, timezone);
  const endBase = end ?? new Date(start.getTime() + DAY_MS);
  const endUTC = fromZonedTime(`${dayStr(endBase)} 00:00:00`, timezone);
  return {
    start: startUTC,
    end: endUTC.getTime() <= startUTC.getTime() ? new Date(startUTC.getTime() + DAY_MS) : endUTC,
  };
}

/**
 * Parse raw iCal text into concrete busy events within `window`.
 * Recurring events are expanded into individual occurrences (RRULE + EXDATE +
 * RECURRENCE-ID overrides handled by node-ical).
 */
async function parseIcsBusyEvents(
  icsText: string,
  window: { start: Date; end: Date },
  boatTimezone: string
): Promise<ParsedBusyEvent[]> {
  const ical = await import("node-ical");
  const data = ical.parseICS(icsText);
  const out: ParsedBusyEvent[] = [];

  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== "VEVENT") continue;

    const event = component as VEvent;
    if ((event.status ?? "").toUpperCase() === "CANCELLED") continue;
    if (!event.start) continue;

    const summary = paramValueToString(event.summary);

    if (event.rrule) {
      // Recurring — expand occurrences inside the window.
      let instances: ReturnType<typeof ical.expandRecurringEvent> = [];
      try {
        instances = ical.expandRecurringEvent(event, {
          from: window.start,
          to: window.end,
        });
      } catch {
        instances = [];
      }
      for (const instance of instances) {
        if (!instance.start) continue;
        let start = instance.start as Date;
        let end = clampEnd(start, instance.end as Date | undefined);
        if (event.datetype === "date") {
          ({ start, end } = allDayBounds(start, instance.end as Date | undefined, boatTimezone));
        }
        out.push({
          uid: event.uid ?? null,
          summary: paramValueToString(instance.summary) ?? summary,
          start,
          end,
        });
        if (out.length >= MAX_EVENTS_PER_CALENDAR) return out;
      }
      continue;
    }

    // Single occurrence — include only if it overlaps the window.
    let start = event.start as Date;
    let end = clampEnd(start, event.end as Date | undefined);
    if (event.datetype === "date") {
      ({ start, end } = allDayBounds(start, event.end as Date | undefined, boatTimezone));
    }
    if (end < window.start || start > window.end) continue;

    out.push({ uid: event.uid ?? null, summary, start, end });
    if (out.length >= MAX_EVENTS_PER_CALENDAR) return out;
  }

  return out;
}

/** Fetch the iCal feed text with a timeout, validating it looks like iCal. */
async function fetchIcsText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "KOSYachts-CalendarSync/1.0" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`Feed returned HTTP ${res.status}`);
    }
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("URL did not return a valid iCal (.ics) feed");
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sync a single external calendar by id. Always records the outcome on the
 * calendar row; never throws.
 */
export async function syncExternalCalendar(calendarId: string): Promise<SyncResult> {
  const [calendar] = await db
    .select()
    .from(boatExternalCalendars)
    .where(eq(boatExternalCalendars.id, calendarId))
    .limit(1);

  if (!calendar) {
    return { status: "ERROR", eventCount: 0, error: "Calendar not found" };
  }

  const now = new Date();

  try {
    // All-day events are rebuilt around the boat's local midnight.
    const [boat] = await db
      .select({ timezone: boats.timezone })
      .from(boats)
      .where(eq(boats.id, calendar.boatId))
      .limit(1);
    const boatTimezone = getBoatTimezone({ timezone: boat?.timezone ?? null });

    const text = await fetchIcsText(calendar.icalUrl);
    const parsed = await parseIcsBusyEvents(text, syncWindow(now), boatTimezone);

    // Replace this calendar's events. neon-http has no interactive
    // transactions, so we delete then bulk-insert; the insert is a single
    // statement to keep the empty window as small as possible.
    await db
      .delete(boatExternalCalendarEvents)
      .where(eq(boatExternalCalendarEvents.externalCalendarId, calendar.id));

    if (parsed.length > 0) {
      await db.insert(boatExternalCalendarEvents).values(
        parsed.map((e) => ({
          externalCalendarId: calendar.id,
          boatId: calendar.boatId,
          uid: e.uid,
          summary: e.summary,
          startTime: e.start,
          endTime: e.end,
        }))
      );
    }

    await db
      .update(boatExternalCalendars)
      .set({
        lastSyncedAt: now,
        lastSyncStatus: "SUCCESS",
        lastSyncError: null,
        lastEventCount: parsed.length,
        updatedAt: now,
      })
      .where(eq(boatExternalCalendars.id, calendar.id));

    return { status: "SUCCESS", eventCount: parsed.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await db
      .update(boatExternalCalendars)
      .set({
        lastSyncedAt: now,
        lastSyncStatus: "ERROR",
        lastSyncError: message.slice(0, 500),
        updatedAt: now,
      })
      .where(eq(boatExternalCalendars.id, calendar.id));

    return { status: "ERROR", eventCount: 0, error: message };
  }
}

/** Sync every enabled calendar (used by the cron route). */
export async function syncAllEnabledCalendars(): Promise<
  Array<{ calendarId: string; boatId: string } & SyncResult>
> {
  const calendars = await db
    .select({ id: boatExternalCalendars.id, boatId: boatExternalCalendars.boatId })
    .from(boatExternalCalendars)
    .where(eq(boatExternalCalendars.syncEnabled, true));

  const results: Array<{ calendarId: string; boatId: string } & SyncResult> = [];
  for (const calendar of calendars) {
    const result = await syncExternalCalendar(calendar.id);
    results.push({ calendarId: calendar.id, boatId: calendar.boatId, ...result });
  }
  return results;
}
