"use server";

import { eq } from "drizzle-orm";

import { db } from "@/database/db";
import { bookingPricing } from "@/database/schema";
import { requireDealAccess, revalidateDeal } from "@/features/bookings/lib/deal-access";
import { bookingOpsService } from "@/features/bookings/services/booking-ops.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import { effectiveTotalCents } from "@/features/bookings/lib/booking-money";
import { MANUAL_PAYMENT_METHOD_LABELS, type ManualPaymentMethod } from "@/features/bookings/lib/manual-payment";
import { paymentService } from "@/features/payments/payment.service";
import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import {
  availabilityService,
  isOverlapConstraintError,
  SlotUnavailableError,
} from "@/features/availability/services/availability.service";
import { sendBookingConfirmationEmail } from "@/shared/lib/services/email.service";

/**
 * Records an off-platform payment. Optionally waives the card-processing fee
 * (the fee is a cost of paying by card — a Zelle payer never owed it), which
 * lowers the effective total so "paid in full" means what the customer
 * actually paid. Syncs ops PAID / client-paid against the effective total.
 *
 * Status follows the money: a payment means the customer is in, so a
 * PROPOSED row becomes BOOKED (calendar blocked), and paid-in-full sends the
 * same confirmation email a card payer gets.
 */
export async function recordBookingManualPaymentAction(
  bookingId: string,
  input: { amountCents: number; method: ManualPaymentMethod; waiveServiceFee: boolean }
) {
  try {
    const authResult = await requireDealAccess(bookingId, "record-payment");
    if (authResult.error !== undefined) return { success: false as const, error: authResult.error };
    const { amountCents, method, waiveServiceFee } = input;

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return { success: false as const, error: "Enter a valid payment amount greater than zero." };
    }

    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return { success: false as const, error: "Booking not found" };
    if ((booking.totalAmountCents ?? 0) <= 0) {
      return { success: false as const, error: "Price the booking before recording a payment." };
    }

    // Waive first so the remaining-balance math below sees the new total.
    const waived = booking.serviceFeeWaived || waiveServiceFee;
    if (waiveServiceFee && !booking.serviceFeeWaived) {
      await db
        .update(bookingPricing)
        .set({ serviceFeeWaived: true })
        .where(eq(bookingPricing.bookingId, bookingId));
    }

    const targetCents = effectiveTotalCents({ ...booking, serviceFeeWaived: waived });
    const payments = await paymentService.getBookingPayments(bookingId);
    const recordedCents = payments.reduce(
      (sum, p) => (p.status !== "SUCCEEDED" || p.paymentType === "REFUND" ? sum : sum + Number(p.amountCents)),
      0
    );
    const remainingCents = targetCents - recordedCents;
    if (remainingCents <= 0) {
      return { success: false as const, error: "This booking has no remaining balance to record." };
    }
    if (amountCents > remainingCents) {
      return {
        success: false as const,
        error: "That amount is more than the remaining balance. Refresh the page and try again.",
      };
    }

    const newRecordedTotal = recordedCents + amountCents;
    const label = MANUAL_PAYMENT_METHOD_LABELS[method];

    // Locking in a proposal claims the slot — check it BEFORE recording money
    // so we never hold a payment against a date that just sold elsewhere.
    const locksIn = booking.bookingStatus === "PROPOSED";
    if (locksIn && booking.boatId && booking.startDateTime && booking.endDateTime) {
      try {
        await availabilityService.assertSlotAvailable(
          booking.boatId,
          new Date(booking.startDateTime),
          new Date(booking.endDateTime),
          bookingId
        );
      } catch (error) {
        if (error instanceof SlotUnavailableError) {
          return {
            success: false as const,
            error: "That slot was just taken on the calendar — move the trip before recording a payment.",
          };
        }
        throw error;
      }
    }

    await paymentService.createPayment({
      payableType: "BOOKING",
      payableId: bookingId,
      paymentType: recordedCents === 0 && newRecordedTotal >= targetCents ? "FULL_PAYMENT" : "PARTIAL",
      amountCents,
      status: "SUCCEEDED",
      paymentMethodType: "MANUAL",
      paymentMethodDetail: label,
      notes: `Recorded via admin — ${label}${waiveServiceFee ? ", card fee waived" : ""}`,
      processedAt: new Date(),
    });

    await bookingOpsService.upsert(bookingId, {
      paidCents: newRecordedTotal,
      clientPaid: newRecordedTotal >= targetCents,
    });

    if (waiveServiceFee && !booking.serviceFeeWaived) {
      await bookingEventsService.logEvent({
        bookingId,
        eventType: BOOKING_EVENT_TYPES.UPDATED,
        actorType: "admin",
        actorId: authResult.session.user.id,
        channel: "admin_portal",
        displayMessage: `Card fee waived — paid by ${label}`,
      });
    }

    // Status follows the money.
    const paidInFull = newRecordedTotal >= targetCents;
    try {
      if (locksIn) {
        await bookingStatusService.markBooked(bookingId, {
          changedByUserId: authResult.session.user.id,
          reason: `Payment recorded (${label}) — booked`,
          actorType: "admin",
          channel: "admin_portal",
        });
      }
      if (paidInFull && (locksIn || booking.bookingStatus === "BOOKED")) {
        const paid = await bookingService.getBookingById(bookingId);
        if (paid) {
          await sendBookingConfirmationEmail(paid).catch((e) =>
            console.error("Confirmation email failed:", e)
          );
        }
      }
    } catch (error) {
      // Race loser on the no-overlap constraint: the payment IS recorded, the
      // slot isn't ours. Say so instead of pretending.
      if (isOverlapConstraintError(error)) {
        revalidateDeal(bookingId);
        return {
          success: false as const,
          error:
            "Payment recorded, but the slot was taken at the same moment — move the trip, then mark it booked.",
        };
      }
      throw error;
    }

    revalidateDeal(bookingId);
    return { success: true as const };
  } catch (error) {
    console.error("recordBookingManualPaymentAction:", error);
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to record payment" };
  }
}
