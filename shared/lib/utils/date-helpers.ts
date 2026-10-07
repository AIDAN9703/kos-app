/**
 * Date Utilities - Clean & Concise
 * 
 * With SuperJSON: Dates are Date objects everywhere
 * Only convert: Form inputs (ISO strings) → Date objects for DB
 */

import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { timezoneEnum } from '@/database/schema/enums';

type SupportedTimezones = typeof timezoneEnum.enumValues[number];
const DEFAULT_TIMEZONE: SupportedTimezones = 'America/New_York';

/**
 * Convert form input (ISO string) to Date for database
 * Handles empty strings and invalid dates
 */
export function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (!value || value === "") return null;
  if (value instanceof Date) return value;
  
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get boat timezone or default
 */
export function getBoatTimezone(boat: { 
  timezone?: SupportedTimezones | string | null;
}): SupportedTimezones {
  return (boat.timezone as SupportedTimezones) || DEFAULT_TIMEZONE;
}

/**
 * Create ISO string from date + time in boat's timezone
 * Used when user selects date/time in booking form
 */
export function createDateTimeISO(
  date: Date, 
  time: string, 
  boat?: { timezone?: SupportedTimezones | string | null; }
): string {
  if (!date || !time) return "";
  
  const timezone = boat ? getBoatTimezone(boat) : DEFAULT_TIMEZONE;
  // Use the date's LOCAL calendar fields (what the user saw/picked), not its UTC
  // date. `toISOString()` shifts east-of-UTC users back a day for local-midnight
  // dates picked in the calendar.
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const boatDateTimeStr = `${dateStr} ${time}:00`;
  const utcDateTime = fromZonedTime(boatDateTimeStr, timezone);
  
  return utcDateTime.toISOString();
}

/**
 * Convert date string and time string from boat timezone to UTC ISO string
 * This is the correct way to handle date/time inputs from forms
 */
export function convertBoatDateTimeToUTC(
  dateStr: string, // YYYY-MM-DD format
  timeStr: string, // HH:mm format
  boatTimezone: SupportedTimezones | string | null
): string {
  if (!dateStr) return "";
  
  const timezone = (boatTimezone as SupportedTimezones) || DEFAULT_TIMEZONE;
  const time = timeStr || "00:00";
  const boatDateTimeStr = `${dateStr} ${time}:00`;
  const utcDateTime = fromZonedTime(boatDateTimeStr, timezone);
  
  return utcDateTime.toISOString();
}

/**
 * Parse Date object or ISO string and return date/time in boat's timezone
 * Used for displaying booking times
 * Returns null date if input is invalid, but time is always a string (empty if invalid)
 */
export function parseDateTimeInBoatTimezone(
  dateTime: Date | string | null | undefined,
  boat?: { timezone?: SupportedTimezones | string | null; }
): { date: Date | null; time: string } {
  if (!dateTime) return { date: null, time: "" };
  
  const timezone = boat ? getBoatTimezone(boat) : DEFAULT_TIMEZONE;
  const dateObj = dateTime instanceof Date ? dateTime : new Date(dateTime);
  
  if (isNaN(dateObj.getTime())) return { date: null, time: "" };
  
  const boatDateTime = toZonedTime(dateObj, timezone);
  
  return {
    date: boatDateTime,
    time: `${boatDateTime.getHours().toString().padStart(2, "0")}:${boatDateTime.getMinutes().toString().padStart(2, "0")}`
  };
}

/**
 * Format an instant in the BOAT's local time — the only correct clock for a
 * charter, since the boat leaves a physical dock. Never renders in the
 * viewer's timezone, so a customer in Chicago and the captain in Miami read
 * the same departure hour. Include "zzz" in the pattern for the zone label.
 */
export function formatBoatLocal(
  dateTime: Date | string | null | undefined,
  boatTimezone: SupportedTimezones | string | null | undefined,
  pattern: string
): string {
  if (!dateTime) return "";
  const d = dateTime instanceof Date ? dateTime : new Date(dateTime);
  if (isNaN(d.getTime())) return "";
  return formatInTimeZone(d, getBoatTimezone({ timezone: boatTimezone ?? undefined }), pattern);
}

/**
 * Get the UTC instants for the start and end of a calendar day in the boat's
 * timezone. Use this to fetch a day's availability so the window matches the
 * boat's local day regardless of the viewer's browser timezone.
 */
export function getBoatDayBoundsUTC(
  date: Date,
  boat?: { timezone?: SupportedTimezones | string | null }
): { startUTC: Date; endUTC: Date } {
  const timezone = boat ? getBoatTimezone(boat) : DEFAULT_TIMEZONE;
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    startUTC: fromZonedTime(`${dateStr} 00:00:00`, timezone),
    endUTC: fromZonedTime(`${dateStr} 23:59:59`, timezone),
  };
}

/**
 * Calculate end datetime from start + hours
 */
export function calculateEndDateTime(startDateTime: Date, hours: number): Date {
  if (!startDateTime || !hours) return startDateTime;
  const end = new Date(startDateTime);
  end.setHours(end.getHours() + hours);
  return end;
}

/**
 * NOT YET WIRED — these two are the conversion pair for the pending
 * boat-local INPUT fix (see task: charter times boat-local everywhere).
 * BookingTripCard's datetime-local inputs currently read/write browser-local,
 * which stores the wrong instant when an admin edits from another timezone.
 *
 * Value for `<input type="datetime-local" />` representing an instant in the boat's timezone.
 */
export function bookingInstantToDatetimeLocalInput(
  dateTime: Date | string | null | undefined,
  boatTimezone: SupportedTimezones | string | null | undefined
): string {
  if (!dateTime) return "";
  const d = dateTime instanceof Date ? dateTime : new Date(dateTime);
  if (isNaN(d.getTime())) return "";
  const tz = getBoatTimezone({ timezone: boatTimezone ?? undefined });
  return formatInTimeZone(d, tz, "yyyy-MM-dd'T'HH:mm");
}

/** Parse naive datetime-local string as boat-local wall time → UTC ISO (for API / DB). */
export function datetimeLocalInputToUtcISO(
  localValue: string,
  boatTimezone: SupportedTimezones | string | null | undefined
): string | null {
  const trimmed = localValue?.trim();
  if (!trimmed) return null;
  const [dateStr, rest] = trimmed.split("T");
  if (!dateStr) return null;
  const timeStr = (rest ?? "00:00").slice(0, 5);
  const iso = convertBoatDateTimeToUTC(dateStr, timeStr, boatTimezone ?? null);
  return iso || null;
}
