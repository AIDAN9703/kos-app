"use server";


import { bookingService } from "@/features/bookings/services/booking.service";
import { alertTeam } from "@/features/bookings/lib/team-alerts";
import { getOrCreateCheckoutUrl } from "@/features/bookings/actions/stripe-checkout";
import {
  availabilityService,
  SlotUnavailableError,
} from "@/features/availability/services/availability.service";
import { revalidateDeal } from "@/features/bookings/lib/deal-access";

type StartPaymentResult =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string };

/**
 * The guest pays from their proposal link — deposit or everything owed.
 * There is no separate "accept" step: payment is the yes. Nothing changes
 * here; the booking is confirmed when Stripe reports the money (webhook).
 * The date is re-checked first so nobody pays for a slot that's gone.
 */
export async function startProposalPayment(
  publicToken: string,
  chargeType: "deposit" | "full"
): Promise<StartPaymentResult> {
  if (!publicToken || (chargeType !== "deposit" && chargeType !== "full")) {
    return { success: false, error: "This payment link isn't valid." };
  }

  try {
    const rows = await bookingService.getProposalBookingsByPublicToken(publicToken);
    const lead = rows?.find((b) => b.boatId && b.startDateTime);
    if (!rows || !lead) {
      return { success: false, error: "This proposal is no longer open. Please contact us." };
    }

    for (const b of rows) {
      if (b.bookingStatus === "PROPOSED" && b.boatId && b.startDateTime && b.endDateTime) {
        await availabilityService.assertSlotAvailable(
          b.boatId,
          b.startDateTime,
          b.endDateTime,
          b.id
        );
      }
    }

    const checkoutUrl = await getOrCreateCheckoutUrl(lead.id, { chargeType });
    return { success: true, checkoutUrl };
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return {
        success: false,
        error:
          "That date was just booked by someone else. Please contact us and we'll find another option.",
      };
    }
    console.error("startProposalPayment failed:", error);
    return {
      success: false,
      error: "We couldn't open the payment page. Please try again, or contact us.",
    };
  }
}

export interface RequestProposalChangesResponse {
  success: boolean;
  error?: string;
}

/** Customer asks for changes from the public proposal page — logs straight
 *  onto the deal's activity timeline for the admin. */
export async function requestProposalChangesAction(
  _prevState: RequestProposalChangesResponse,
  formData: FormData
): Promise<RequestProposalChangesResponse> {
  try {
    const publicToken = (formData.get("publicToken") as string) || "";
    const message = ((formData.get("message") as string) || "").trim();

    if (!publicToken) return { success: false, error: "Invalid link" };
    if (!message) return { success: false, error: "Please describe the changes you'd like." };
    if (message.length > 2000) {
      return { success: false, error: "Please keep your message under 2000 characters." };
    }

    const { bookingId } = await bookingService.requestProposalChanges(publicToken, message);

    const booking = await bookingService.getBookingById(bookingId);
    await alertTeam({
      subject: `Change requested — ${booking?.customerName ?? "customer"}`,
      heading: "Customer requested changes to their proposal",
      booking,
      extraLines: [{ label: "Their message", value: message }],
      note: "Update the trip on the booking page, then resend — it's the same link.",
    });

    revalidateDeal(bookingId);

    return { success: true };
  } catch (error) {
    console.error("Request proposal changes error:", error);
    return { success: false, error: "Failed to send your request. Please try again." };
  }
}
