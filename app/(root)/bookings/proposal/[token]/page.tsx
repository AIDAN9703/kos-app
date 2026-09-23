import { notFound } from "next/navigation";
import { bookingService } from "@/features/bookings/services/booking.service";
import PublicProposalClient from "@/features/bookings/components/PublicProposalClient";
import type { ProposalData } from "@/features/bookings/lib/proposal.types";

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
    allowPayment: raw.allowPayment,
    acceptedAt: raw.acceptedAt,
    totalPaidCents: raw.totalPaidCents ?? 0,
    depositAmountCents: raw.depositAmountCents ?? null,
    totalAmountCents: raw.totalAmountCents ?? 0,
    bookings: raw.bookings,
  };

  return <PublicProposalClient data={data} publicToken={token} />;
}
