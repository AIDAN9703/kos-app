import "server-only";

import { availabilityService } from "@/features/availability/services/availability.service";
import { planCharge } from "@/features/bookings/lib/charge-plan";
import type {
  ProposalBooking,
  ProposalData,
  ProposalPaymentOptions,
} from "@/features/bookings/lib/proposal.types";
import { alertTeam } from "@/features/bookings/lib/team-alerts";
import { getOrCreateCheckoutUrl } from "@/features/bookings/services/checkout.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { UserFacingError } from "@/shared/lib/errors";
import { isUuid } from "@/shared/lib/utils/general-utils";
import { formatServiceFee } from "@/shared/lib/utils/pricing-utils";

/**
 * Proposal data layer: what the holder of a proposal link may see and do.
 * The link's token is the credential — it only works once the proposal was
 * sent (published) and while the deal is PROPOSED or BOOKED, and it reaches
 * only its own booking or charter party.
 */

/** The proposal page, or null when the link isn't live. */
export async function getProposal(token: string): Promise<ProposalData | null> {
  if (!isUuid(token)) return null;
  const raw = await bookingService.getProposalForPublicDisplay(token);
  if (!raw) return null;

  return {
    id: raw.id,
    updatedAt: raw.updatedAt,
    customerName: raw.customerName,
    startDateTime: raw.startDateTime,
    endDateTime: raw.endDateTime,
    numberOfPassengers: raw.numberOfPassengers ?? 1,
    pickupLocation: raw.pickupLocation,
    dropoffLocation: raw.dropoffLocation,
    timezone: raw.timezone,
    totalPaidCents: raw.totalPaidCents ?? 0,
    totalAmountCents: raw.totalAmountCents ?? 0,
    bookings: raw.bookings,
    payment: paymentOptions(raw.bookings, raw.totalPaidCents ?? 0, raw.totalAmountCents ?? 0),
  };
}

/**
 * Price the page's payment choices with the same planner checkout uses, so
 * the amount on the button is the amount Stripe takes.
 */
function paymentOptions(
  bookings: ProposalBooking[],
  paidCents: number,
  totalCents: number
): ProposalPaymentOptions {
  const offCard = bookings.some((b) => b.serviceFeeWaived);
  const boats = bookings.map((b) => ({
    bookingId: b.id,
    totalCents: b.totalCents,
    serviceFeeCents: b.serviceFeeCents,
    serviceFee: b.serviceFee,
    serviceFeeWaived: b.serviceFeeWaived,
    depositCents: b.depositCents,
    // The deposit is only offered before anything is paid, so per-boat
    // paid amounts aren't needed here.
    paidCents: 0,
  }));
  const deposit = paidCents === 0 && !offCard ? planCharge(boats, "deposit") : null;
  const fee = boats[0]?.serviceFee;
  return {
    offCard,
    remainingCents: Math.max(0, totalCents - paidCents),
    deposit:
      deposit?.ok === true
        ? {
            baseCents: deposit.plan.lines.reduce((sum, l) => sum + l.baseCents, 0),
            feeCents: deposit.plan.feeCents,
            amountCents: deposit.plan.amountCents,
          }
        : null,
    feeLabel: fee && (fee.bps > 0 || fee.fixedCents > 0) ? formatServiceFee(fee) : null,
  };
}

/**
 * The guest pays from their proposal link — deposit or everything owed.
 * There is no separate "accept" step: payment is the yes. The booking is
 * confirmed when Stripe reports the money (webhook). The date is re-checked
 * first so nobody pays for a slot that's gone. Returns the checkout URL.
 */
export async function startProposalPayment(token: string, chargeType: "deposit" | "full"): Promise<string> {
  if (!isUuid(token) || (chargeType !== "deposit" && chargeType !== "full")) {
    throw new UserFacingError("This payment link isn't valid.", 404);
  }
  const rows = await bookingService.getProposalBookingsByPublicToken(token);
  const lead = rows?.find((b) => b.boatId && b.startDateTime);
  if (!rows || !lead) {
    throw new UserFacingError("This proposal is no longer open. Please contact us.", 404);
  }

  for (const b of rows) {
    if (b.bookingStatus !== "PROPOSED" || !b.boatId || !b.startDateTime || !b.endDateTime) continue;
    const { isAvailable } = await availabilityService.checkTimeSlotAvailability(
      b.boatId,
      b.startDateTime,
      b.endDateTime,
      b.id
    );
    if (!isAvailable) {
      throw new UserFacingError(
        "That date was just booked by someone else. Please contact us and we'll find another option.",
        409
      );
    }
  }
  return getOrCreateCheckoutUrl(lead.id, { chargeType });
}

/**
 * The customer asks for changes from the proposal page: it lands on the
 * deal's timeline and the team gets an email. Returns the lead booking id.
 */
export async function requestProposalChanges(token: string, rawMessage: string): Promise<string> {
  const message = rawMessage.trim();
  if (!isUuid(token)) throw new UserFacingError("Invalid link", 404);
  if (!message) throw new UserFacingError("Please describe the changes you'd like.");
  if (message.length > 2000) {
    throw new UserFacingError("Please keep your message under 2000 characters.");
  }

  const { bookingId } = await bookingService.requestProposalChanges(token, message);
  const booking = await bookingService.getBookingById(bookingId);
  await alertTeam({
    subject: `Change requested — ${booking?.customerName ?? "customer"}`,
    heading: "Customer requested changes to their proposal",
    booking,
    extraLines: [{ label: "Their message", value: message }],
    note: "Update the trip on the booking page, then resend — it's the same link.",
  });
  return bookingId;
}
