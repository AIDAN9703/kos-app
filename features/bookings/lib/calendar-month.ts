import { addDays, addMonths, endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getBoatTimezone } from "@/shared/lib/utils/date-helpers";

/**
 * Calendar math for the bookings calendar and the dashboard's two weeks,
 * shared by the server (what to load) and the grid (which days to draw).
 * Months are "YYYY-MM"; days are "yyyy-MM-dd" calendar dates.
 */

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function firstOf(month: string) {
  return parse(`${month}-01`, "yyyy-MM-dd", new Date());
}

/** ?month= when it's a real month, else the current one in company time. */
export function resolveMonth(param: string | null | undefined, now: Date): string {
  return param && MONTH.test(param) ? param : formatInTimeZone(now, getBoatTimezone({}), "yyyy-MM");
}

export function shiftMonth(month: string, by: number): string {
  return format(addMonths(firstOf(month), by), "yyyy-MM");
}

export function monthTitle(month: string): string {
  return format(firstOf(month), "MMMM yyyy");
}

/** The days the grid shows: whole weeks around the month, Sunday first. */
export function monthGridDays(month: string): string[] {
  const first = firstOf(month);
  const last = endOfWeek(endOfMonth(first));
  const days: string[] = [];
  for (let day = startOfWeek(startOfMonth(first)); day <= last; day = addDays(day, 1)) {
    days.push(format(day, "yyyy-MM-dd"));
  }
  return days;
}

/** Whole weeks from the start of this week (company time), Sunday first. */
export function weekGridDays(now: Date, weeks: number): string[] {
  const today = parse(formatInTimeZone(now, getBoatTimezone({}), "yyyy-MM-dd"), "yyyy-MM-dd", new Date());
  const first = startOfWeek(today);
  return Array.from({ length: weeks * 7 }, (_, i) => format(addDays(first, i), "yyyy-MM-dd"));
}

/**
 * What to load for a grid of days: UTC bounds with a day of slack on each
 * side, so a trip near midnight lands on its boat's local day whatever the
 * zone.
 */
export function gridQueryRange(days: string[]): { from: Date; to: Date } {
  return {
    from: addDays(new Date(`${days[0]}T00:00:00Z`), -1),
    to: addDays(new Date(`${days[days.length - 1]}T00:00:00Z`), 2),
  };
}
