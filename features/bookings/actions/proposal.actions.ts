"use server";

import * as proposals from "@/features/bookings/proposal.data";
import { revalidateDeal } from "@/features/bookings/lib/revalidate-deal";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * Proposal link actions (whoever holds the link). Thin wrappers over
 * proposal.data.ts, which checks the link is live.
 */

/** Pay a deposit or everything owed; returns the Stripe checkout URL. */
export async function startProposalPayment(
  publicToken: string,
  chargeType: "deposit" | "full"
): Promise<ActionResponse<{ checkoutUrl: string }>> {
  try {
    return { success: true, data: { checkoutUrl: await proposals.startProposalPayment(publicToken, chargeType) } };
  } catch (error) {
    return actionError(error, "We couldn't open the payment page. Please try again, or contact us.");
  }
}

interface RequestProposalChangesResponse {
  success: boolean;
  error?: string;
}

/** The customer asks for changes (form action). */
export async function requestProposalChangesAction(
  _prevState: RequestProposalChangesResponse,
  formData: FormData
): Promise<RequestProposalChangesResponse> {
  try {
    const bookingId = await proposals.requestProposalChanges(
      String(formData.get("publicToken") ?? ""),
      String(formData.get("message") ?? "")
    );
    revalidateDeal(bookingId);
    return { success: true };
  } catch (error) {
    return actionError(error, "Failed to send your request. Please try again.");
  }
}
