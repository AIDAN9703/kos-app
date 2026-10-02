import { notFound } from "next/navigation";
import { bookingService } from "@/features/bookings/services/booking.service";
import PublicProposalClient from "@/features/bookings/components/PublicProposalClient";
import type {
  ProposalBooking,
  ProposalData,
  ProposalPaymentOptions,
} from "@/features/bookings/lib/proposal.types";
import { planCharge } from "@/features/bookings/lib/charge-plan";
import { formatServiceFee } from "@/shared/lib/utils/pricing-utils";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params;
  const raw = await bookingService.getProposalForPublicDisplay(token);

  if (!raw) {
    notFound();
  }

  const data: ProposalData = {
    id: raw.id,
    updatedAt: raw.updatedAt,
    customerName: raw.customerName,
    customerEmail: raw.customerEmail,
    startDateTime: raw.startDateTime,
    endDateTime: raw.endDateTime,
    numberOfPassengers: raw.numberOfPassengers ?? 1,
    pickupLocation: raw.pickupLocation,
    dropoffLocation: raw.dropoffLocation,
    timezone: raw.timezone,
    totalPaidCents: raw.totalPaidCents ?? 0,
    totalAmountCents: raw.totalAmountCents ?? 0,
    bookings: raw.bookings,
    payment: proposalPaymentOptions(
      raw.bookings,
      raw.totalPaidCents ?? 0,
      raw.totalAmountCents ?? 0
    ),
  };

  return <PublicProposalClient data={data} publicToken={token} />;
}

/**
 * Price the page's payment choices with the same planner checkout uses, so
 * the amount on the button is the amount Stripe takes.
 */
function proposalPaymentOptions(
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
