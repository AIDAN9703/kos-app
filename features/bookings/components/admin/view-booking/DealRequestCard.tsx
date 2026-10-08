import Link from "next/link";

import { GlassPanel } from "@/shared/admin/components/glass";
import { TIME_OF_DAY_LABELS } from "@/features/bookings/deal-status";
import { formatDate, formatPlainDate } from "@/shared/lib/utils/general-utils";
import type { BookingDetails } from "@/features/bookings/booking.types";

/**
 * What the customer asked for — the INQUIRY-phase face of the trip card.
 * Once the deal is priced into a proposal, BookingTripCard takes over.
 */
export function DealRequestCard({ deal }: { deal: BookingDetails }) {
  // Same title as BookingTripCard so both stages open with an identical-
  // looking panel; the chip carries the stage nuance.
  return (
    <GlassPanel
      title={
        <span className="flex items-center gap-2">
          Trip details
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Requested
          </span>
        </span>
      }
      className="gap-4"
    >
      {/* Same reading order as the booking face: when first, then which boat,
            then everything else. */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Fact
          label="Date"
          value={
            deal.startDateTime
              ? formatDate(deal.startDateTime)
              : deal.preferredDate
                ? formatPlainDate(deal.preferredDate)
                : null
          }
        />
        <Fact
          label="Time of day"
          value={
            deal.preferredTimeOfDay
              ? (TIME_OF_DAY_LABELS[deal.preferredTimeOfDay] ?? deal.preferredTimeOfDay)
              : null
          }
        />
        <Fact
          label="Duration"
          value={deal.requestedDurationDays ? `${deal.requestedDurationDays}+ days` : null}
        />
        <Fact
          label="Boat requested"
          value={
            deal.boatId ? (
              <Link
                href={`/admin/boats/${deal.boatId}`}
                className="text-primary-strong hover:underline"
              >
                {deal.boatName ?? "View boat"}
              </Link>
            ) : null
          }
        />
        <Fact label="Destination" value={deal.destination} />
        <Fact
          label="Guests"
          value={deal.numberOfPassengers != null ? `${deal.numberOfPassengers}` : null}
        />
        <Fact
          label="Captain"
          value={deal.needsCaptain == null ? null : deal.needsCaptain ? "Needed" : "Not needed"}
        />
        <Fact label="SMS consent" value={deal.smsConsent ? "Yes" : "No"} />
      </dl>
      {deal.customerMessage ? (
        <div className="mt-5 border-t border-border/50 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Message
          </p>
          <p className="mt-1.5 max-w-prose whitespace-pre-wrap text-sm leading-relaxed">
            {deal.customerMessage}
          </p>
        </div>
      ) : null}
    </GlassPanel>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
