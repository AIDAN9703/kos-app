"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/database/db";
import { bookings } from "@/database/schema";
import { getOrCreateCheckoutUrl } from "@/features/bookings/actions/stripe-checkout";
import { getAuthenticatedUserId } from "@/shared/lib/utils/auth-utils";
import { getTrip } from "../profile.queries";

export type StartTripPaymentResult =
  | { success: true; url: string }
  | { success: false; error: string };

/**
 * Open Stripe Checkout for one of the customer's OWN booked trips.
 *
 * Checkout charges the deposit or the full amount (the customer's pick), not
 * an arbitrary remainder — so this only runs while nothing has been paid yet.
 * Once a deposit is in, the balance is collected through the payment link the
 * team sends, and the trip page says so instead of showing a button.
 */
export async function startTripPayment(
  bookingId: string,
  chargeType: "deposit" | "full"
): Promise<StartTripPaymentResult> {
  const auth = await getAuthenticatedUserId();
  if (!auth.userId) return { success: false, error: auth.error ?? "Not authenticated" };

  const trip = await getTrip(auth.userId, bookingId);
  if (!trip) return { success: false, error: "We couldn't find that trip." };
  if (trip.status !== "BOOKED" || trip.paidCents > 0 || trip.totalCents <= 0) {
    return { success: false, error: "This trip isn't awaiting a card payment." };
  }
  if (chargeType === "deposit" && !(trip.depositCents && trip.depositCents < trip.totalCents)) {
    return { success: false, error: "This trip doesn't have a deposit option." };
  }

  // Belt and braces: the query above is already user-scoped, but checkout
  // creation is a money action, so re-assert ownership right before it.
  const [owned] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, auth.userId)))
    .limit(1);
  if (!owned) return { success: false, error: "We couldn't find that trip." };

  try {
    return { success: true, url: await getOrCreateCheckoutUrl(bookingId, { chargeType }) };
  } catch (error) {
    console.error("startTripPayment failed:", error);
    return {
      success: false,
      error: "We couldn't start checkout for this trip. Please contact us and we'll sort it out.",
    };
  }
}
