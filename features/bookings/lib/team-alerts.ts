import type { BookingDetails } from "@/features/bookings/booking.types";
import {
  sendAdminAlertEmail,
  type AdminAlertEmailParams,
} from "@/shared/lib/services/email.service";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";

type AlertLine = AdminAlertEmailParams["lines"][number];

/** The rows every booking alert opens with: who, which boat, when, how much. */
function bookingAlertLines(b: BookingDetails): AlertLine[] {
  return [
    { label: "Customer", value: b.customerName },
    { label: "Email", value: b.customerEmail },
    { label: "Phone", value: b.customerPhone },
    { label: "Boat", value: b.boatName },
    {
      label: "Trip",
      value: b.startDateTime
        ? formatBoatLocal(b.startDateTime, b.boatTimezone, "EEE, MMM d, yyyy · h:mm a zzz")
        : null,
    },
    { label: "Guests", value: b.numberOfPassengers != null ? String(b.numberOfPassengers) : null },
    {
      label: "Total",
      value:
        b.totalAmountCents > 0
          ? formatCentsAsCurrency(b.totalAmountCents, { currency: b.currency ?? "USD" })
          : null,
    },
  ];
}

/**
 * Tell the team something happened on a deal — accepted, paid, change
 * requested, instant booking landed. Server-only. Never throws and never
 * blocks the flow that fired it; failures only log.
 */
export async function alertTeam(params: {
  subject: string;
  heading: string;
  booking?: BookingDetails | null;
  extraLines?: AlertLine[];
  note?: string;
}): Promise<void> {
  try {
    await sendAdminAlertEmail({
      subject: params.subject,
      heading: params.heading,
      bookingId: params.booking?.id ?? null,
      lines: [
        ...(params.booking ? bookingAlertLines(params.booking) : []),
        ...(params.extraLines ?? []),
      ],
      note: params.note,
    });
  } catch (error) {
    console.error("Team alert failed:", params.subject, error);
  }
}
