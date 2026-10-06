import "server-only";

/**
 * Booking Status Service
 *
 * Business logic layer for booking status transitions.
 * Uses direct database access (no repository layer).
 *
 * Every status change creates a history entry for full traceability.
 */

import { db } from "@/database/db";
import { bookings, bookingStatusHistory } from "@/database/schema";
import { eq } from "drizzle-orm";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import type { BookingStatus, BookingStatusHistory } from "@/database/types";
import { UserFacingError } from "@/shared/lib/errors";

// ============================================================================
// TYPES
// ============================================================================

export interface StatusTransitionInput {
  bookingId: string;
  newStatus: BookingStatus;
  changedByUserId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================================================
// STATUS TRANSITION RULES
// ============================================================================

/**
 * Valid status transitions
 * Maps current status to array of valid next statuses
 */
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  // A lead gets priced into a proposal, or dies (CANCELLED = lost).
  INQUIRY: ["PROPOSED", "CANCELLED"],
  // The customer accepts / admin marks booked / money lands → BOOKED.
  PROPOSED: ["BOOKED", "CANCELLED"],
  BOOKED: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["CANCELLED"],
  CANCELLED: [],
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  fromStatus: BookingStatus,
  toStatus: BookingStatus
): boolean {
  const validNextStatuses = VALID_TRANSITIONS[fromStatus] ?? [];
  return validNextStatuses.includes(toStatus);
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class BookingStatusService {
  /**
   * Get current status of a booking
   */
  async getCurrentStatus(bookingId: string): Promise<BookingStatus | null> {
    const [booking] = await db
      .select({ bookingStatus: bookings.bookingStatus })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    return booking?.bookingStatus ?? null;
  }

  /**
   * Transition booking to a new status
   * Creates history entry and updates booking status
   *
   * @throws Error if transition is invalid
   */
  async transitionStatus(input: StatusTransitionInput): Promise<BookingStatusHistory> {
    const { bookingId, newStatus, changedByUserId, reason, metadata } = input;

    // Get current status
    const currentStatus = await this.getCurrentStatus(bookingId);
    if (currentStatus === null) {
      throw new UserFacingError("Booking not found", 404);
    }

    // Validate transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      throw new UserFacingError(
        `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
          `Valid transitions from ${currentStatus}: ${VALID_TRANSITIONS[currentStatus].join(", ") || "none"}`
      );
    }

    // Update booking status
    await db
      .update(bookings)
      .set({
        bookingStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Create history entry
    const [historyEntry] = await db
      .insert(bookingStatusHistory)
      .values({
        bookingId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        changedByUserId: changedByUserId ?? null,
        reason: reason ?? null,
        metadata: metadata ?? null,
      })
      .returning();

    await bookingEventsService.logStatusChange({
      bookingId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      actorType: changedByUserId ? "admin" : "system",
      actorId: changedByUserId ?? null,
      reason: reason ?? null,
    });

    return historyEntry;
  }

  /**
   * Create initial status history entry for a new booking
   * Called when booking is first created
   */
  async createInitialHistory(
    bookingId: string,
    initialStatus: BookingStatus,
    createdByUserId?: string | null,
    reason?: string
  ): Promise<BookingStatusHistory> {
    const [historyEntry] = await db
      .insert(bookingStatusHistory)
      .values({
        bookingId,
        fromStatus: null,
        toStatus: initialStatus,
        changedByUserId: createdByUserId ?? null,
        reason: reason ?? "Booking created",
      })
      .returning();

    await bookingEventsService.logStatusChange({
      bookingId,
      fromStatus: null,
      toStatus: initialStatus,
      actorType: createdByUserId ? "admin" : "system",
      actorId: createdByUserId ?? null,
      reason: reason ?? "Booking created",
    });

    return historyEntry;
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR COMMON TRANSITIONS
  // ============================================================================

  /**
   * Mark booking as completed (BOOKED → COMPLETED)
   */
  async complete(bookingId: string, adminId?: string): Promise<BookingStatusHistory> {
    return this.transitionStatus({
      bookingId,
      newStatus: "COMPLETED",
      changedByUserId: adminId,
      reason: "Charter completed",
    });
  }

  /**
   * Cancel a booking (covers denied requests, expirations, refunds, and manual cancellations).
   * The reason is stored in both status history and the booking's cancellationReason field.
   */
  async cancel(
    bookingId: string,
    reason: string,
    cancelledByUserId?: string | null
  ): Promise<BookingStatusHistory> {
    await db
      .update(bookings)
      .set({
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: cancelledByUserId ?? null,
      })
      .where(eq(bookings.id, bookingId));

    return this.transitionStatus({
      bookingId,
      newStatus: "CANCELLED",
      changedByUserId: cancelledByUserId ?? null,
      reason,
    });
  }

  /**
   * The trip is theirs: PROPOSED → BOOKED. One verb for every road in — the
   * guest's payment landing (confirmPaidBooking), an admin marking it booked
   * after a phone yes, or a recorded payment. Availability is the caller's
   * job; the exclusion constraint is the last line of defense.
   */
  async markBooked(
    bookingId: string,
    options?: {
      changedByUserId?: string | null;
      reason?: string;
      actorType?: "user" | "admin" | "system";
      channel?: string;
    }
  ): Promise<BookingStatusHistory> {
    const currentStatus = await this.getCurrentStatus(bookingId);
    if (currentStatus === null) throw new UserFacingError("Booking not found", 404);
    if (currentStatus !== "PROPOSED")
      throw new UserFacingError(`Only a proposal can be marked booked (status: ${currentStatus})`);

    await db
      .update(bookings)
      .set({ bookingStatus: "BOOKED", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));

    const reason = options?.reason ?? "Booked";
    const [historyEntry] = await db
      .insert(bookingStatusHistory)
      .values({
        bookingId,
        fromStatus: "PROPOSED",
        toStatus: "BOOKED",
        changedByUserId: options?.changedByUserId ?? null,
        reason,
      })
      .returning();

    await bookingEventsService.logStatusChange({
      bookingId,
      fromStatus: "PROPOSED",
      toStatus: "BOOKED",
      actorType: options?.actorType ?? (options?.changedByUserId ? "admin" : "system"),
      actorId: options?.changedByUserId ?? null,
      reason,
      channel: options?.channel,
    });

    return historyEntry;
  }
}

// Export singleton instance
export const bookingStatusService = new BookingStatusService();
