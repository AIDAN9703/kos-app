import "server-only";

import { db } from "@/database/db";
import { boats, bookings, boatBlocking, boatExternalCalendarEvents } from "@/database/schema";
import { eq, and, ne, lt, gt, inArray } from "drizzle-orm";
import { pgErrorCode, UserFacingError } from "@/shared/lib/errors";

/**
 * Availability — ONE definition of "is this slot free", used by every
 * surface (boat page calendar, instant checkout, request intake, admin
 * approve, proposal accept, webhook fulfillment).
 *
 * All intervals are half-open [start, end): back-to-back charters that share
 * an exact boundary do not conflict. The same rule is enforced at the
 * database layer by the `booking_no_overlap` exclusion constraint
 * (migration 0056) — these checks exist to give humans friendly errors
 * BEFORE money moves; the constraint exists so a race can never win.
 */

/** Booking statuses that hold the calendar. Must match migration 0056. */
// BOOKED is the one status that holds a slot; proposals never block.
const CALENDAR_BLOCKING_STATUSES = ["BOOKED"] as const;

export interface AvailabilityConflict {
  type: "booking" | "blocking" | "external" | "validation";
  id: string;
  startTime: Date;
  endTime: Date;
  reason: string;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  conflicts: AvailabilityConflict[];
}

export interface CalendarDay {
  date: Date;
  status: "available" | "booked" | "blocked" | "partial";
  conflictCount: number;
}

/** Thrown by assertSlotAvailable when the slot is taken. */
export class SlotUnavailableError extends UserFacingError {
  readonly conflicts: AvailabilityConflict[];
  constructor(conflicts: AvailabilityConflict[]) {
    super("This time slot is no longer available. Please choose a different time.", 409);
    this.name = "SlotUnavailableError";
    this.conflicts = conflicts;
  }
}

/**
 * True when a DB error is the `booking_no_overlap` exclusion constraint
 * firing (Postgres error 23P01) — the race-loser signal.
 */
export function isOverlapConstraintError(error: unknown): boolean {
  return pgErrorCode(error) === "23P01";
}

class AvailabilityService {
  /**
   * Check one time slot. `excludeBookingId` lets a booking's own row be
   * ignored (re-checking while approving/editing that same booking).
   */
  async checkTimeSlotAvailability(
    boatId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<AvailabilityResult> {
    if (!startTime || !endTime || startTime >= endTime) {
      return {
        isAvailable: false,
        conflicts: [
          {
            type: "validation",
            id: "invalid-time-range",
            startTime,
            endTime,
            reason: "Invalid time range provided",
          },
        ],
      };
    }

    const conflicts = await this.getConflicts(boatId, startTime, endTime, excludeBookingId);
    return { isAvailable: conflicts.length === 0, conflicts };
  }

  /** Same check, but throws SlotUnavailableError — for commit points. */
  async assertSlotAvailable(
    boatId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<void> {
    const result = await this.checkTimeSlotAvailability(
      boatId,
      startTime,
      endTime,
      excludeBookingId
    );
    if (!result.isAvailable) throw new SlotUnavailableError(result.conflicts);
  }

  /** Calendar month view for a boat (boat page + admin calendar). */
  async getMonthAvailability(boatId: string, month: Date): Promise<CalendarDay[]> {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conflicts = await this.getConflicts(boatId, monthStart, monthEnd);

    const days: CalendarDay[] = [];
    const cursor = new Date(monthStart);
    while (cursor < monthEnd) {
      // Past days aren't bookable — skip them entirely.
      if (cursor < today) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // Half-open on both sides: a conflict touches this day iff it starts
      // before the day ends and ends after the day starts.
      const dayConflicts = conflicts.filter(
        (c) => c.startTime < dayEnd && c.endTime > dayStart
      );
      const fullyBooked = dayConflicts.some(
        (c) => c.startTime <= dayStart && c.endTime >= dayEnd
      );

      days.push({
        date: new Date(cursor),
        status: dayConflicts.length === 0 ? "available" : fullyBooked ? "booked" : "partial",
        conflictCount: dayConflicts.length,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  /**
   * Everything occupying [startTime, endTime) for a boat: calendar-blocking
   * bookings, manual blocks, and imported external (iCal) events.
   */
  private async getConflicts(
    boatId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<AvailabilityConflict[]> {
    // Turnaround: every occupied window (booking, block, external event)
    // effectively runs [start − t, end + t] — cleaning, refuel, crew change.
    // Applied once: the SQL window is widened so buffered neighbors are
    // found, and the returned intervals carry the padding so slot pickers
    // and calendars gray out the turnaround too.
    const [boatRow] = await db
      .select({ turnaroundMinutes: boats.turnaroundMinutes })
      .from(boats)
      .where(eq(boats.id, boatId))
      .limit(1);
    const bufferMs = (boatRow?.turnaroundMinutes ?? 0) * 60_000;
    const windowStart = new Date(startTime.getTime() - bufferMs);
    const windowEnd = new Date(endTime.getTime() + bufferMs);
    const pad = (start: Date, end: Date) => ({
      startTime: new Date(start.getTime() - bufferMs),
      endTime: new Date(end.getTime() + bufferMs),
    });
    const turnaroundNote =
      bufferMs > 0 ? ` (incl. ${boatRow!.turnaroundMinutes}m turnaround)` : "";

    const [blockingBookings, blockingPeriods, externalEvents] = await Promise.all([
      db
        .select({
          id: bookings.id,
          startDateTime: bookings.startDateTime,
          endDateTime: bookings.endDateTime,
          customerName: bookings.customerName,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.boatId, boatId),
            inArray(bookings.bookingStatus, [...CALENDAR_BLOCKING_STATUSES]),
            excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
            // Half-open overlap against the turnaround-widened window:
            // existing.start < window.end AND existing.end > window.start
            lt(bookings.startDateTime, windowEnd),
            gt(bookings.endDateTime, windowStart)
          )
        ),
      db
        .select()
        .from(boatBlocking)
        .where(
          and(
            eq(boatBlocking.boatId, boatId),
            lt(boatBlocking.startTime, windowEnd),
            gt(boatBlocking.endTime, windowStart)
          )
        ),
      db
        .select()
        .from(boatExternalCalendarEvents)
        .where(
          and(
            eq(boatExternalCalendarEvents.boatId, boatId),
            lt(boatExternalCalendarEvents.startTime, windowEnd),
            gt(boatExternalCalendarEvents.endTime, windowStart)
          )
        ),
    ]);

    return [
      ...blockingBookings
        // Blocking statuses always carry dates; the type-level nulls exist
        // for INQUIRY-phase deals, which this query never matches.
        .filter(
          (b): b is typeof b & { startDateTime: Date; endDateTime: Date } =>
            b.startDateTime != null && b.endDateTime != null
        )
        .map((b) => ({
          type: "booking" as const,
          id: b.id,
          ...pad(b.startDateTime, b.endDateTime),
          reason: `Booked by ${b.customerName}${turnaroundNote}`,
        })),
      ...blockingPeriods.map((b) => ({
        type: "blocking" as const,
        id: b.id,
        ...pad(b.startTime, b.endTime),
        reason: b.reason || `${b.blockingType}`,
      })),
      ...externalEvents.map((e) => ({
        type: "external" as const,
        id: e.id,
        ...pad(e.startTime, e.endTime),
        reason: `${e.summary || "External calendar"}${turnaroundNote}`,
      })),
    ];
  }
}

export const availabilityService = new AvailabilityService();
