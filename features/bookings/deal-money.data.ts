import "server-only";

import { z } from "zod";

import { getAppSettings } from "@/features/app-settings/app-settings.service";
import { availabilityService, isOverlapConstraintError } from "@/features/availability/services/availability.service";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import type { BookingExpenseLine } from "@/features/bookings/booking-expense.types";
import { bookingExpenseLineInputSchema } from "@/features/bookings/booking.validation";
import { assertDealAccess } from "@/features/bookings/deal.data";
import { effectiveTotalCents } from "@/features/bookings/lib/booking-money";
import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_METHOD_LABELS,
} from "@/features/bookings/lib/manual-payment";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { bookingExpenseLineService } from "@/features/bookings/services/booking-expense-line.service";
import { bookingOpsService } from "@/features/bookings/services/booking-ops.service";
import { bookingPricingService } from "@/features/bookings/services/booking-pricing.service";
import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { netPaidCents, paymentService } from "@/features/payments/payment.service";
import { UserFacingError } from "@/shared/lib/errors";
import { sendBookingConfirmationEmail } from "@/shared/lib/services/email.service";
import {
  calculateBookingPriceCents,
  serviceFeeFromSnapshot,
  type ServiceFee,
} from "@/shared/lib/utils/pricing-utils";

/**
 * Deal money data layer (staff): re-pricing a deal, the company's expense
 * lines, and money received off-card. Same access rule as deal.data.ts, with
 * the money permissions on top (booking:price, view-economics, record-payment).
 */

async function requireBooking(bookingId: string) {
  const booking = await bookingService.getBookingById(bookingId);
  if (!booking) throw new UserFacingError("Booking not found", 404);
  return booking;
}

/** Money the booking has kept, net of refunds, in cents. */
async function paidCents(bookingId: string): Promise<number> {
  return netPaidCents(await paymentService.getBookingPayments(bookingId));
}

// ============================================================================
// PRICING
// ============================================================================

const centsField = z.number().int().min(0);

const dealPricingSchema = z.object({
  pricingTierId: z.string().uuid().nullable(),
  basePriceCents: centsField,
  captainFeeCents: centsField,
  cleaningFeeCents: centsField,
  depositAmountCents: centsField.nullable(),
  addOns: z.array(
    z.object({
      name: z.string().trim().min(1, "Add-on needs a name"),
      description: z.string().trim().nullable().optional(),
      unitPrice: z.number().min(0),
      quantity: z.number().int().min(1),
    })
  ),
});

/**
 * The fee this booking was priced with. Settings can change after a proposal
 * goes out; re-pricing must not silently move a customer's fee, so use the
 * booking's snapshot and fall back to settings only for never-priced rows.
 */
async function feeForBooking(booking: {
  serviceFeeBps: number | null;
  serviceFeeFixedCents: number | null;
  serviceFeeCents: number | null;
  totalAmountCents: number | null;
}): Promise<ServiceFee> {
  if (booking.serviceFeeBps != null || (booking.serviceFeeCents ?? 0) > 0) {
    return serviceFeeFromSnapshot(booking);
  }
  return (await getAppSettings()).serviceFee;
}

/**
 * Re-price a deal from its page — the same numbers the composer sets at
 * creation (tier or custom base, captain, cleaning, add-ons, deposit). The card
 * fee and total are recomputed here, never typed, so the customer's math
 * always adds up.
 */
export async function updateDealPricing(bookingId: string, rawInput: unknown): Promise<void> {
  const user = await assertDealAccess(bookingId, "price");
  const input = dealPricingSchema.parse(rawInput);

  const booking = await requireBooking(bookingId);
  if (booking.bookingStatus === "INQUIRY") {
    throw new UserFacingError("Price this inquiry with Create proposal first.");
  }
  if (booking.bookingStatus === "COMPLETED" || booking.bookingStatus === "CANCELLED") {
    throw new UserFacingError("This deal is settled — its pricing is history now.");
  }

  const addOns = input.addOns.map((a) => ({
    name: a.name,
    description: a.description ?? null,
    unitPrice: a.unitPrice,
    quantity: a.quantity,
    total: Math.round(a.unitPrice * a.quantity * 100) / 100,
  }));
  const addOnsCents = Math.round(addOns.reduce((sum, a) => sum + a.total, 0) * 100);

  const fee = await feeForBooking(booking);
  const breakdown = calculateBookingPriceCents(
    input.basePriceCents,
    input.cleaningFeeCents,
    input.captainFeeCents,
    addOnsCents,
    fee
  );
  const total = breakdown.totalPriceCents;
  if (total <= 0) throw new UserFacingError("The total has to be more than zero.");

  // Money already in can't exceed the new price — that would need a refund, not an edit.
  const paid = await paidCents(bookingId);
  const effectiveTotal = booking.serviceFeeWaived ? breakdown.subtotalCents : total;
  if (paid > effectiveTotal) {
    throw new UserFacingError(
      `The customer has already paid ${(paid / 100).toFixed(2)} — the new total can't be less than that.`
    );
  }
  // The deposit is entered before the card fee, so it must sit below the
  // subtotal for "pay the deposit first" to mean anything.
  if (input.depositAmountCents != null && input.depositAmountCents >= breakdown.subtotalCents) {
    throw new UserFacingError(
      "The deposit has to be less than the subtotal, or leave it blank for full payment only."
    );
  }

  const previous = {
    pricingTierId: booking.pricingTierId,
    basePriceCents: booking.basePriceCents,
    captainFeeCents: booking.captainFeeCents,
    cleaningFeeCents: booking.cleaningFeeCents,
    serviceFeeCents: booking.serviceFeeCents,
    depositAmountCents: booking.depositAmountCents,
    totalAmountCents: booking.totalAmountCents,
    addOns: booking.addOns ?? [],
  };
  const next = {
    pricingTierId: input.pricingTierId,
    basePriceCents: breakdown.basePriceCents,
    captainFeeCents: breakdown.captainFeeCents,
    cleaningFeeCents: breakdown.cleaningFeeCents,
    serviceFeeCents: breakdown.serviceFeeCents,
    depositAmountCents: input.depositAmountCents,
    totalAmountCents: total,
    addOns,
  };
  if (JSON.stringify(previous) === JSON.stringify(next)) return;

  // No transactions on the neon-http driver: booking row first, then the
  // pricing row. Both writes are idempotent re-runs of the same values.
  await bookingService.setQuoteSelection(bookingId, { pricingTierId: input.pricingTierId, addOns });
  await bookingPricingService.updatePricing(bookingId, {
    basePriceCents: breakdown.basePriceCents,
    captainFeeCents: breakdown.captainFeeCents || null,
    cleaningFeeCents: breakdown.cleaningFeeCents || null,
    serviceFeeCents: breakdown.serviceFeeCents,
    serviceFeeBps: fee.bps,
    serviceFeeFixedCents: fee.fixedCents,
    depositAmountCents: input.depositAmountCents || null,
    totalAmountCents: total,
  });

  // Logged as an UPDATED event so the Breakdown counts it as an unsent change.
  await bookingEventsService.logBookingUpdated({
    bookingId,
    actorId: user.id,
    previousState: { pricing: previous },
    newState: { pricing: next },
    changedFields: ["pricing"],
  });
}

// ============================================================================
// EXPENSE LINES (the company's costs — view-economics)
// ============================================================================

export async function getExpenseLines(bookingId: string): Promise<BookingExpenseLine[]> {
  await assertDealAccess(bookingId, "view-economics");
  return bookingExpenseLineService.getLines(bookingId);
}

/** Suggested lines for a deal with none yet (the boat tier's owner payout). */
export async function getExpenseDefaults(bookingId: string) {
  await assertDealAccess(bookingId, "view-economics");
  return bookingExpenseLineService.getDefaultsForBooking(bookingId);
}

export async function saveExpenseLines(bookingId: string, rawLines: unknown): Promise<BookingExpenseLine[]> {
  await assertDealAccess(bookingId, "view-economics");
  const lines = z.array(bookingExpenseLineInputSchema).parse(rawLines);
  return bookingExpenseLineService.saveLines(bookingId, lines);
}

// ============================================================================
// MONEY RECEIVED OFF-CARD (record-payment)
// ============================================================================

const manualPaymentSchema = z.object({
  amountCents: z.number().int().positive("Enter a valid payment amount greater than zero."),
  method: z.enum(MANUAL_PAYMENT_METHODS),
  waiveServiceFee: z.boolean(),
});

/**
 * Record an off-platform payment. Optionally waives the card fee (a Zelle
 * payer never owed it), which lowers the effective total so "paid in full"
 * means what the customer actually paid.
 *
 * Status follows the money: a payment means the customer is in, so a
 * PROPOSED row becomes BOOKED (calendar blocked), and paid-in-full sends the
 * same confirmation email a card payer gets.
 */
export async function recordManualPayment(bookingId: string, rawInput: unknown): Promise<void> {
  const user = await assertDealAccess(bookingId, "record-payment");
  const { amountCents, method, waiveServiceFee } = manualPaymentSchema.parse(rawInput);

  const booking = await requireBooking(bookingId);
  if ((booking.totalAmountCents ?? 0) <= 0) {
    throw new UserFacingError("Price the booking before recording a payment.");
  }

  // Waive first so the remaining-balance math below sees the new total.
  const waivesNow = waiveServiceFee && !booking.serviceFeeWaived;
  if (waivesNow) await bookingPricingService.updatePricing(bookingId, { serviceFeeWaived: true });

  const targetCents = effectiveTotalCents({ ...booking, serviceFeeWaived: booking.serviceFeeWaived || waiveServiceFee });
  const recordedCents = await paidCents(bookingId);
  const remainingCents = targetCents - recordedCents;
  if (remainingCents <= 0) throw new UserFacingError("This booking has no remaining balance to record.");
  if (amountCents > remainingCents) {
    throw new UserFacingError("That amount is more than the remaining balance. Refresh the page and try again.");
  }

  const newRecordedTotal = recordedCents + amountCents;
  const label = MANUAL_PAYMENT_METHOD_LABELS[method];

  // Locking in a proposal claims the slot — check it BEFORE recording money
  // so we never hold a payment against a date that just sold elsewhere.
  const locksIn = booking.bookingStatus === "PROPOSED";
  if (locksIn && booking.boatId && booking.startDateTime && booking.endDateTime) {
    const { isAvailable } = await availabilityService.checkTimeSlotAvailability(
      booking.boatId,
      new Date(booking.startDateTime),
      new Date(booking.endDateTime),
      bookingId
    );
    if (!isAvailable) {
      throw new UserFacingError(
        "That slot was just taken on the calendar — move the trip before recording a payment.",
        409
      );
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

  if (waivesNow) {
    await bookingEventsService.logEvent({
      bookingId,
      eventType: BOOKING_EVENT_TYPES.UPDATED,
      actorType: "admin",
      actorId: user.id,
      channel: "admin_portal",
      displayMessage: `Card fee waived — paid by ${label}`,
    });
  }

  // Status follows the money.
  const paidInFull = newRecordedTotal >= targetCents;
  try {
    if (locksIn) {
      await bookingStatusService.markBooked(bookingId, {
        changedByUserId: user.id,
        reason: `Payment recorded (${label}) — booked`,
        actorType: "admin",
        channel: "admin_portal",
      });
    }
    if (paidInFull && (locksIn || booking.bookingStatus === "BOOKED")) {
      const paidBooking = await bookingService.getBookingById(bookingId);
      if (paidBooking) {
        await sendBookingConfirmationEmail(paidBooking).catch((e) =>
          console.error("Confirmation email failed:", e)
        );
      }
    }
  } catch (error) {
    // Race loser on the no-overlap constraint: the payment IS recorded, the
    // slot isn't ours. Say so instead of pretending.
    if (isOverlapConstraintError(error)) {
      throw new UserFacingError(
        "Payment recorded, but the slot was taken at the same moment — move the trip, then mark it booked.",
        409
      );
    }
    throw error;
  }
}
