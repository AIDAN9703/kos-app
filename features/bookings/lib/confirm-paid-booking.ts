import "server-only";

import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { isOverlapConstraintError } from "@/features/availability/services/availability.service";

export type ConfirmOutcome =
  /** PROPOSED → BOOKED. */
  | "booked"
  /** Already BOOKED or COMPLETED — nothing to do (balance payments, retries). */
  | "unchanged"
  /** Paid, but another booking holds the slot — stays PROPOSED for an admin. */
  | "held"
  /** Cancelled (or not a proposal) — money arrived on a dead deal; never revived. */
  | "not_bookable";

/**
 * Money landed for this booking: confirm it, the one safe way. Only a
 * proposal becomes booked (through the status service, so history and the
 * timeline stay right). A cancelled or completed booking is never flipped
 * back, and a paid booking that collides with a taken slot is held instead
 * of throwing, so a webhook retry can't loop forever on it.
 */
export async function confirmPaidBooking(
  bookingId: string,
  reason: string
): Promise<ConfirmOutcome> {
  const status = await bookingStatusService.getCurrentStatus(bookingId);
  if (status === "BOOKED" || status === "COMPLETED") return "unchanged";
  if (status !== "PROPOSED") return "not_bookable";

  try {
    await bookingStatusService.markBooked(bookingId, {
      reason,
      actorType: "system",
      channel: "stripe",
    });
    return "booked";
  } catch (error) {
    if (!isOverlapConstraintError(error)) throw error;
    await bookingEventsService.logEvent({
      bookingId,
      eventType: "booking.overlap_hold",
      actorType: "system",
      channel: "stripe",
      displayMessage:
        "⚠ Paid, but the date was taken by another booking — held for manual resolution",
    });
    return "held";
  }
}
