import "server-only";

import type { ExternalCalendarListItem } from "@/features/availability/availability.types";
import { availabilityService, type CalendarDay } from "@/features/availability/services/availability.service";
import * as calendars from "@/features/availability/services/calendar.service";
import * as externalCalendars from "@/features/availability/services/external-calendar.service";
import {
  syncAllEnabledCalendars,
  syncExternalCalendar,
} from "@/features/availability/services/external-calendar-sync.service";
import { verifyFeedToken, type FeedScope } from "@/shared/lib/calendar/feed-tokens";
import type { IcsEvent } from "@/shared/lib/calendar/ics";
import { AccessDenied, UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Availability data layer: when boats are free. The public sees busy windows
 * only — never who booked, why a boat is blocked, or what an imported event
 * says. Admins (boat:edit) see the full calendar and manage iCal imports;
 * subscribed calendar apps hold a signed feed URL; the scheduler holds
 * CRON_SECRET.
 */

const DAY_MS = 24 * 3600 * 1000;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ============================================================================
// PUBLIC
// ============================================================================

/** When a boat is taken within a window (at most two months), for the booking form's time slots. */
export async function getBusyWindows(
  boatId: string,
  startIso: string | null,
  endIso: string | null
): Promise<{ startTime: Date; endTime: Date }[]> {
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  if (!isUuid(boatId) || !start || !end || end <= start || end.getTime() - start.getTime() > 62 * DAY_MS) {
    throw new UserFacingError("Missing or invalid date range");
  }
  const { conflicts } = await availabilityService.checkTimeSlotAvailability(boatId, start, end);
  return conflicts.map((c) => ({ startTime: c.startTime, endTime: c.endTime }));
}

/** A month of day statuses (free, partly taken, booked, blocked) for the booking calendar. */
export async function getMonthCalendar(boatId: string, month: string | null): Promise<CalendarDay[]> {
  const match = month?.match(/^(\d{4})-(\d{2})$/);
  if (!isUuid(boatId) || !match) throw new UserFacingError("Missing month parameter");
  return availabilityService.getMonthAvailability(boatId, new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

// ============================================================================
// ADMIN CALENDAR (boat:edit)
// ============================================================================

/** FullCalendar event feed shape — bookings and external blocks share it. */
interface CalendarFeedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: Record<string, unknown>;
}

const BOOKED_COLOR = "#22c55e"; // green — only BOOKED trips are shown
const EXTERNAL_COLOR = "#6b7280"; // gray — imported, read-only

/** Booked trips and imported blocks in a window, optionally for one boat. */
export async function getCalendarEvents(
  startIso: string | null,
  endIso: string | null,
  boatId?: string | null
): Promise<CalendarFeedEvent[]> {
  await assertCan({ boat: ["edit"] });
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  if (!start || !end) throw new UserFacingError("Start and end dates required");
  if (boatId && !isUuid(boatId)) return [];

  const { booked, external } = await calendars.getCalendarEvents(start, end, boatId ?? undefined);
  const events: CalendarFeedEvent[] = booked
    // A calendar event needs both ends; blocking statuses always have them.
    .filter((b): b is typeof b & { start: Date; end: Date } => b.start != null && b.end != null)
    .map((b) => ({
      id: `booking-${b.id}`,
      title: `${b.customerName} (${b.boatName})`,
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      backgroundColor: BOOKED_COLOR,
      borderColor: BOOKED_COLOR,
      textColor: "#ffffff",
      extendedProps: {
        type: "booking",
        bookingId: b.id,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        boatName: b.boatName,
        boatId: b.boatId,
        numberOfPassengers: b.numberOfPassengers,
        totalAmountCents: b.totalAmountCents ?? 0,
        bookingStatus: b.status,
      },
    }));
  for (const e of external) {
    events.push({
      id: `external-${e.id}`,
      title: e.summary || "External event",
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      backgroundColor: EXTERNAL_COLOR,
      borderColor: EXTERNAL_COLOR,
      textColor: "#ffffff",
      extendedProps: { type: "external", boatId: e.boatId },
    });
  }
  return events;
}

// ============================================================================
// EXTERNAL (iCal) CALENDARS (boat:edit)
// ============================================================================

/** Normalize and validate an iCal URL. Converts webcal:// to https://. */
function normalizeIcalUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (url.toLowerCase().startsWith("webcal://")) url = "https://" + url.slice("webcal://".length);
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function requireCalendarBoat(calendarId: string): Promise<string> {
  const boatId = isUuid(calendarId) ? await externalCalendars.getBoatId(calendarId) : null;
  if (!boatId) throw new UserFacingError("Calendar not found", 404);
  return boatId;
}

export async function listExternalCalendars(boatId: string): Promise<ExternalCalendarListItem[]> {
  await assertCan({ boat: ["edit"] });
  return isUuid(boatId) ? externalCalendars.listForBoat(boatId) : [];
}

/**
 * Subscribe a boat to an iCal calendar and sync it right away, so the admin
 * sees results without waiting for the scheduler. Returns the event count, or
 * the first sync's error (the calendar is still added).
 */
export async function addExternalCalendar(
  boatId: string,
  input: { name: string; icalUrl: string }
): Promise<{ eventCount?: number; syncError?: string }> {
  await assertCan({ boat: ["edit"] });
  if (!isUuid(boatId)) throw new UserFacingError("Boat not found", 404);
  const name = input.name?.trim();
  if (!name) throw new UserFacingError("Please give the calendar a name");
  const icalUrl = normalizeIcalUrl(input.icalUrl ?? "");
  if (!icalUrl) throw new UserFacingError("Enter a valid iCal (https or webcal) URL");

  const { id } = await externalCalendars.create(boatId, name, icalUrl);
  const result = await syncExternalCalendar(id);
  return result.status === "ERROR" ? { syncError: result.error } : { eventCount: result.eventCount };
}

/** Pull a calendar's events now. Returns the boat id (to refresh its pages) and the count. */
export async function syncExternalCalendarNow(calendarId: string): Promise<{ boatId: string; eventCount: number }> {
  await assertCan({ boat: ["edit"] });
  const boatId = await requireCalendarBoat(calendarId);
  const result = await syncExternalCalendar(calendarId);
  if (result.status === "ERROR") throw new UserFacingError(result.error);
  return { boatId, eventCount: result.eventCount };
}

/** Pause (its blocks stop counting at once) or resume (re-pull fresh blocks). Returns the boat id. */
export async function setExternalCalendarEnabled(calendarId: string, enabled: boolean): Promise<string> {
  await assertCan({ boat: ["edit"] });
  const boatId = await requireCalendarBoat(calendarId);
  await externalCalendars.setEnabled(calendarId, enabled);
  if (enabled) await syncExternalCalendar(calendarId);
  else await externalCalendars.clearEvents(calendarId);
  return boatId;
}

/** Unsubscribe; its imported events go with it. Returns the boat id. */
export async function removeExternalCalendar(calendarId: string): Promise<string> {
  await assertCan({ boat: ["edit"] });
  const boatId = await requireCalendarBoat(calendarId);
  await externalCalendars.remove(calendarId);
  return boatId;
}

// ============================================================================
// SUBSCRIBABLE FEEDS (signed URL) AND THE SCHEDULER (CRON_SECRET)
// ============================================================================

const FEED_LOOKBACK_DAYS = 60;
const FEED_LOOKAHEAD_DAYS = 365;

/**
 * Booked trips as calendar events for a signed feed URL — scoped to a boat,
 * a captain, or a boat owner. The HMAC binds that exact scope. Owner feeds
 * leave out customer contact details, like the owner portal does.
 */
export async function getCalendarFeed(params: {
  scope: string | null;
  boatId?: string;
  captainId?: string;
  ownerId?: string;
  token: string;
  origin: string;
}): Promise<{ name: string; events: IcsEvent[] }> {
  const scope = (params.scope ?? "bookings") as FeedScope;
  if (scope !== "bookings") throw new UserFacingError("Unsupported feed scope");
  const { boatId, captainId, ownerId, origin } = params;
  if (!boatId && !captainId && !ownerId) {
    throw new UserFacingError("Feed must be scoped to a boat, captain, or owner");
  }
  // Throws when CALENDAR_FEED_SECRET is missing (a server error, not the caller's).
  if (!verifyFeedToken({ scope, boatId, captainId, ownerId }, params.token)) {
    throw new AccessDenied("Invalid feed token", 401);
  }

  const now = Date.now();
  const rows = await calendars.getFeedBookings({
    start: new Date(now - FEED_LOOKBACK_DAYS * DAY_MS),
    end: new Date(now + FEED_LOOKAHEAD_DAYS * DAY_MS),
    boatId,
    captainId,
    ownerId,
  });
  const withContact = !ownerId;

  const events: IcsEvent[] = rows
    // Undated INQUIRY-phase deals have no place on a calendar feed.
    .filter((r): r is typeof r & { startDateTime: Date } => r.startDateTime != null)
    .map((r) => ({
      uid: `booking-${r.id}@kosyachts`,
      start: r.startDateTime,
      end: r.endDateTime ?? null,
      summary: r.boatName ? `${r.customerName} · ${r.boatName}` : r.customerName,
      description: [
        `Guests: ${r.numberOfPassengers ?? "—"}`,
        ...(withContact
          ? [`Customer email: ${r.customerEmail}`, `Customer phone: ${r.customerPhone ?? "—"}`]
          : []),
        `Booking: ${origin}/admin/bookings/${r.id}`,
      ].join("\n"),
      location: r.pickupLocation ?? undefined,
      url: `${origin}/admin/bookings/${r.id}`,
      // Only BOOKED trips are queried, and a booked trip is a firm entry.
      status: "CONFIRMED",
    }));

  const name = boatId
    ? "KOS Yachts — Boat schedule"
    : captainId
      ? "KOS Yachts — Captain schedule"
      : "KOS Yachts — Owner schedule";
  return { name, events };
}

/**
 * The scheduled sync of every enabled iCal calendar. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`; without the secret it refuses to run
 * in production.
 */
export async function runScheduledCalendarSync(authorization: string | null) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (authorization !== `Bearer ${cronSecret}`) throw new AccessDenied("Unauthorized", 401);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("CRON_SECRET is not configured");
  }

  const startedAt = Date.now();
  const results = await syncAllEnabledCalendars();
  const succeeded = results.filter((r) => r.status === "SUCCESS").length;
  return {
    ok: true,
    durationMs: Date.now() - startedAt,
    calendars: results.length,
    succeeded,
    failed: results.length - succeeded,
    totalEvents: results.reduce((sum, r) => sum + r.eventCount, 0),
    results,
  };
}
