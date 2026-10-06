"use server";

import * as profile from "@/features/profile/profile.data";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/** Pay for one of the person's own trips; returns the Stripe checkout URL. */
export async function startTripPayment(
  bookingId: string,
  chargeType: "deposit" | "full"
): Promise<ActionResponse<{ url: string }>> {
  try {
    return { success: true, data: { url: await profile.startMyTripPayment(bookingId, chargeType) } };
  } catch (error) {
    return actionError(
      error,
      "We couldn't start checkout for this trip. Please contact us and we'll sort it out."
    );
  }
}
