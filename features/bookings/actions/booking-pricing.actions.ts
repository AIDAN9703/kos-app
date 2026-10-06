"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/database/db";
import { bookings } from "@/database/schema";
import { getAppSettings } from "@/features/app-settings/app-settings.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { bookingPricingService } from "@/features/bookings/services/booking-pricing.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { paymentService } from "@/features/payments/payment.service";
import { requireDealAccess, revalidateDeal } from "@/features/bookings/lib/deal-access";
import {
  calculateBookingPriceCents,
  serviceFeeFromSnapshot,
  type ServiceFee,
} from "@/shared/lib/utils/pricing-utils";

/**
 * Admin re-pricing of an existing deal from the booking detail page — the
 * same numbers the composer sets at creation (tier or custom base, captain,
 * cleaning, add-ons, deposit), editable afterwards. Card fee and total are
 * recomputed here, never typed, so the customer's math always adds up.
 */

type ActionResult = { success: true } | { success: false; error: string };

const centsField = z.number().int().min(0);

const addOnInputSchema = z.object({
  name: z.string().trim().min(1, "Add-on needs a name"),
  description: z.string().trim().nullable().optional(),
  unitPrice: z.number().min(0),
  quantity: z.number().int().min(1),
});

const bookingPricingUpdateSchema = z.object({
  pricingTierId: z.string().uuid().nullable(),
  basePriceCents: centsField,
  captainFeeCents: centsField,
  cleaningFeeCents: centsField,
  depositAmountCents: centsField.nullable(),
  addOns: z.array(addOnInputSchema),
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

export async function updateBookingPricing(
  bookingId: string,
  rawInput: unknown
): Promise<ActionResult> {
  const adminAuth = await requireDealAccess(bookingId, "price");
  if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };

  const parsed = bookingPricingUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid pricing" };
  }
  const input = parsed.data;

  try {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.bookingStatus === "INQUIRY") {
      return { success: false, error: "Price this inquiry with Create proposal first." };
    }
    if (booking.bookingStatus === "COMPLETED" || booking.bookingStatus === "CANCELLED") {
      return { success: false, error: "This deal is settled — its pricing is history now." };
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
    if (total <= 0) return { success: false, error: "The total has to be more than zero." };

    // Money already in can't exceed the new price — that would need a refund, not an edit.
    const paidCents = (await paymentService.getBookingPayments(bookingId)).reduce(
      (sum, p) => (p.status !== "SUCCEEDED" || p.paymentType === "REFUND" ? sum : sum + Number(p.amountCents)),
      0
    );
    const effectiveTotal = booking.serviceFeeWaived ? breakdown.subtotalCents : total;
    if (paidCents > effectiveTotal) {
      return {
        success: false,
        error: `The customer has already paid ${(paidCents / 100).toFixed(2)} — the new total can't be less than that.`,
      };
    }
    // The deposit is entered before the card fee, so it must sit below the
    // subtotal for "pay the deposit first" to mean anything.
    if (input.depositAmountCents != null && input.depositAmountCents >= breakdown.subtotalCents) {
      return {
        success: false,
        error: "The deposit has to be less than the subtotal, or leave it blank for full payment only.",
      };
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
    if (JSON.stringify(previous) === JSON.stringify(next)) return { success: true };

    // No transactions on the neon-http driver: booking row first, then the
    // pricing row. Both writes are idempotent re-runs of the same values.
    await db
      .update(bookings)
      .set({
        pricingTierId: input.pricingTierId,
        addOns: addOns.length > 0 ? addOns : null,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

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
      actorId: adminAuth.session.user.id,
      previousState: { pricing: previous },
      newState: { pricing: next },
      changedFields: ["pricing"],
    });

    revalidateDeal(bookingId);
    return { success: true };
  } catch (error) {
    console.error("updateBookingPricing failed:", error);
    return { success: false, error: "Couldn't save the pricing. Please try again." };
  }
}
