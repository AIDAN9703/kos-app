"use server";

import { getOrCreateCheckoutUrl } from "@/features/bookings/services/checkout.service";
import { getAuthenticatedUserId } from "@/shared/lib/utils/auth-utils";
import { getTrip } from "../profile.queries";

type StartTripPaymentResult = { success: true; url: string } | { success: false; error: string };

/**
 * Open Stripe Checkout for one of the customer's OWN booked trips. getTrip is
 * scoped to the signed-in user, so another customer's booking id is a miss.
 * Before anything is paid they may pick the deposit; after that, "full"
 * charges the remaining balance. Every amount includes its card fee.
 */
export async function startTripPayment(
  bookingId: string,
  chargeType: "deposit" | "full"
): Promise<StartTripPaymentResult> {
  const auth = await getAuthenticatedUserId();
  if (!auth.userId) return { success: false, error: auth.error ?? "Not authenticated" };

  const trip = await getTrip(auth.userId, bookingId);
  if (!trip) return { success: false, error: "We couldn't find that trip." };
  if (trip.status !== "BOOKED" || trip.offCard || trip.balanceCents <= 0) {
    return { success: false, error: "This trip isn't awaiting a card payment." };
  }
  if (chargeType === "deposit" && (trip.paidCents > 0 || !trip.depositChargeCents)) {
    return { success: false, error: "This trip doesn't have a deposit option." };
  }

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
