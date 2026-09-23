"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/database/db";
import { bookingPricing, bookings } from "@/database/schema";
import { getAppSettings } from "@/features/app-settings/app-settings.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { bookingPricingService } from "@/features/bookings/services/booking-pricing.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { paymentService } from "@/features/payments/payment.service";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";
import { calculateBookingPriceCents } from "@/shared/lib/utils/pricing-utils";

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

export type BookingPricingUpdateInput = z.infer<typeof bookingPricingUpdateSchema>;

function revalidateBooking(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin");
}

/**
 * The fee rate this booking was priced with. Settings can change after a
 * proposal goes out; re-pricing must not silently move a customer's rate, so
 * derive it from the snapshot and fall back to settings only for unpriced rows.
 */
async function feeRateForBooking(booking: {
  serviceFeeCents: number | null;
  basePriceCents: number | null;
  captainFeeCents: number | null;
  cleaningFeeCents: number | null;
  addOns?: Array<{ total: number }> | null;
}): Promise<number> {
  const addOnsCents = Math.round((booking.addOns ?? []).reduce((sum, a) => sum + a.total, 0) * 100);
  const subtotal =
    (booking.basePriceCents ?? 0) +
    (booking.captainFeeCents ?? 0) +
    (booking.cleaningFeeCents ?? 0) +
    addOnsCents;
  const fee = booking.serviceFeeCents ?? 0;
  if (subtotal > 0 && fee > 0) {
    // Round to whole basis points so 349.99… reads as 3.5%.
    return Math.round((fee / subtotal) * 10_000) / 10_000;
  }
  return (await getAppSettings()).serviceFeeRate;
}

export async function updateBookingPricing(
  bookingId: string,
  rawInput: unknown
): Promise<ActionResult> {
  const adminAuth = await getAdminSession();
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

    const rate = await feeRateForBooking(booking);
    const breakdown = calculateBookingPriceCents(
      input.basePriceCents,
      input.cleaningFeeCents,
      input.captainFeeCents,
      addOnsCents,
      rate
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
    if (input.depositAmountCents != null && input.depositAmountCents > effectiveTotal) {
      return { success: false, error: "The deposit can't be more than the total." };
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
      depositAmountCents: input.depositAmountCents || null,
      totalAmountCents: total,
    });

    // Logged as an UPDATED event so the resend dialog counts it as an edit.
    await bookingEventsService.logBookingUpdated({
      bookingId,
      actorId: adminAuth.session.user.id,
      previousState: { pricing: previous },
      newState: { pricing: next },
      changedFields: ["pricing"],
    });

    revalidateBooking(bookingId);
    return { success: true };
  } catch (error) {
    console.error("updateBookingPricing failed:", error);
    return { success: false, error: "Couldn't save the pricing. Please try again." };
  }
}

/**
 * Set (or clear) the deposit a guest may pay first. This is the ONLY switch
 * for deposits: an amount means the customer's link offers "pay the deposit"
 * next to "pay in full"; blank means full payment only.
 */
export async function setBookingDeposit(
  bookingId: string,
  depositAmountCents: number | null
): Promise<ActionResult> {
  const adminAuth = await getAdminSession();
  if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };

  const parsed = centsField.nullable().safeParse(depositAmountCents);
  if (!parsed.success) return { success: false, error: "Enter a valid deposit amount." };
  const next = parsed.data && parsed.data > 0 ? parsed.data : null;

  try {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return { success: false, error: "Booking not found" };
    const total = booking.serviceFeeWaived
      ? (booking.totalAmountCents ?? 0) - (booking.serviceFeeCents ?? 0)
      : (booking.totalAmountCents ?? 0);
    if (next != null && next >= total) {
      return { success: false, error: "The deposit has to be less than the total." };
    }
    const current = booking.depositAmountCents ?? null;
    if (next === current) return { success: true };

    await db
      .update(bookingPricing)
      .set({ depositAmountCents: next, updatedAt: new Date() })
      .where(eq(bookingPricing.bookingId, bookingId));

    await bookingEventsService.logBookingUpdated({
      bookingId,
      actorId: adminAuth.session.user.id,
      previousState: { depositAmountCents: current },
      newState: { depositAmountCents: next },
      changedFields: ["depositAmountCents"],
    });

    revalidateBooking(bookingId);
    return { success: true };
  } catch (error) {
    console.error("setBookingDeposit failed:", error);
    return { success: false, error: "Couldn't update the deposit. Please try again." };
  }
}
