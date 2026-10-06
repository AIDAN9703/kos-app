"use server";

import { revalidatePath } from "next/cache";

import * as requests from "@/features/bookings/booking-request.data";
import type { BookingRequest } from "@/features/_validation/validations";
import { revalidateDeal } from "@/features/bookings/lib/revalidate-deal";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * Booking request actions (the website's forms). Thin wrappers over
 * booking-request.data.ts, which validates and prices everything server-side.
 */

type Created = ActionResponse<{ bookingId: string }>;

export async function createGeneralLead(data: requests.GeneralInquiryInput): Promise<Created> {
  try {
    const created = await requests.createGeneralInquiry(data);
    revalidateDeal();
    return {
      success: true,
      data: created,
      message: "Your inquiry has been submitted successfully. Our team will contact you shortly.",
    };
  } catch (error) {
    return actionError(error, "Failed to submit your inquiry. Please try again.");
  }
}

export async function createTermCharterLead(data: requests.TermCharterInquiryInput): Promise<Created> {
  try {
    const created = await requests.createTermCharterInquiry(data);
    revalidateDeal();
    return {
      success: true,
      data: created,
      message: "Your term charter request has been submitted. Our specialists will contact you shortly.",
    };
  } catch (error) {
    return actionError(error, "Failed to submit your inquiry. Please try again.");
  }
}

export async function createBoatLead(data: requests.BoatInquiryInput): Promise<Created> {
  try {
    const created = await requests.createBoatInquiry(data);
    revalidateDeal();
    revalidatePath(`/boats/${data.boatId}`);
    return {
      success: true,
      data: created,
      message: "Your request has been submitted. Our team will review availability and contact you shortly.",
    };
  } catch (error) {
    return actionError(error, "Failed to submit your request. Please try again.");
  }
}

/** Instant Book: returns the Stripe checkout URL (the booking is made after payment). */
export async function createInstantBooking(
  data: BookingRequest & { boatId: string }
): Promise<ActionResponse<{ paymentUrl: string }>> {
  try {
    return { success: true, data: { paymentUrl: await requests.startInstantCheckout(data) } };
  } catch (error) {
    return actionError(error, "Failed to create booking. Please try again.");
  }
}
