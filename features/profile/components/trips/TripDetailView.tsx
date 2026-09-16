import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Anchor, CalendarDays, Clock, MapPin, MessageSquareText, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { guestsLabel, tripDate, tripDurationHours, tripTimeRange, TRIP_FALLBACK_IMAGE } from "../../trip-presentation";
import type { TripDetail } from "../../profile.types";
import { BillingPortalButton } from "../BillingPortalButton";
import { surface } from "../surface";
import { PayTripButton } from "./PayTripButton";
import { TripStatusBadge } from "./TripStatusBadge";

export function TripDetailView({ trip }: { trip: TripDetail }) {
  const hours = tripDurationHours(trip);
  const canPayNow = trip.status === "BOOKED" && trip.paidCents === 0 && trip.totalCents > 0;
  const payLabel =
    trip.depositCents && trip.depositCents < trip.totalCents
      ? `Pay ${formatCentsAsCurrency(trip.depositCents)} deposit`
      : `Pay ${formatCentsAsCurrency(trip.totalCents)}`;

  const facts = [
    { Icon: CalendarDays, label: "Date", value: tripDate(trip) },
    { Icon: Clock, label: "Time", value: [tripTimeRange(trip), hours ? `${hours} hours` : ""].filter(Boolean).join(" · ") },
    { Icon: Users, label: "Guests", value: guestsLabel(trip.guests) + (trip.needsCaptain ? " · Captain included" : "") },
    { Icon: MapPin, label: "Pickup", value: trip.pickupLocation ?? "To be confirmed" },
    trip.dropoffLocation && trip.dropoffLocation !== trip.pickupLocation
      ? { Icon: MapPin, label: "Drop-off", value: trip.dropoffLocation }
      : null,
    trip.occasionType ? { Icon: MessageSquareText, label: "Occasion", value: trip.occasionType } : null,
  ].filter((f): f is { Icon: typeof CalendarDays; label: string; value: string } => Boolean(f?.value));

  return (
    <article className="space-y-8">
      <Link
        href="/profile/bookings"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        All trips
      </Link>

      {/* Hero */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl sm:aspect-[21/9]">
        <Image
          src={trip.boatImage || TRIP_FALLBACK_IMAGE}
          alt={trip.boatName}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 880px"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
              {trip.boatCategory ? trip.boatCategory.toLowerCase().replace(/_/g, " ") : "Charter"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white drop-shadow-md sm:text-3xl">
              {trip.boatName}
            </h1>
          </div>
          <TripStatusBadge trip={trip} className="shadow-sm" />
        </div>
      </div>

      {trip.status === "CANCELLED" ? (
        <p className="rounded-2xl bg-destructive-soft px-5 py-4 text-sm leading-6 text-destructive">
          This trip was cancelled{trip.cancelledAt ? ` on ${format(trip.cancelledAt, "MMM d, yyyy")}` : ""}.
          {trip.cancellationReason ? ` ${trip.cancellationReason}` : ""}
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Trip facts */}
        <section aria-labelledby="trip-details-heading">
          <h2 id="trip-details-heading" className="text-lg font-bold text-primary">
            Trip details
          </h2>
          <dl className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
            {facts.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4 py-3.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <dt className="w-24 shrink-0 text-sm text-slate-500">{label}</dt>
                <dd className="text-[15px] text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>

          {trip.specialRequests ? (
            <div className="mt-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Your requests
              </h3>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-700">{trip.specialRequests}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {trip.boatId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/boats/${trip.boatId}`}>
                  <Anchor />
                  View boat
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href="/contact">Ask about this trip</Link>
            </Button>
          </div>
        </section>

        {/* Money */}
        <aside className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:self-start">
          <div className={`p-5 sm:p-6 ${surface}`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Payment</h2>
            {trip.totalCents > 0 ? (
              <dl className="mt-3 space-y-2 text-sm">
                <MoneyLine label="Total" cents={trip.totalCents} currency={trip.currency} strong />
                {trip.depositCents ? <MoneyLine label="Deposit" cents={trip.depositCents} currency={trip.currency} /> : null}
                <MoneyLine label="Paid" cents={trip.paidCents} currency={trip.currency} />
                <div className="border-t border-gray-200 pt-2">
                  <MoneyLine label="Balance" cents={trip.balanceCents} currency={trip.currency} strong />
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Pricing will appear here once your proposal is ready.
              </p>
            )}

            <div className="mt-5 space-y-3">
              {trip.status === "PROPOSED" && trip.publicToken ? (
                <Button asChild className="w-full">
                  <Link href={`/bookings/proposal/${trip.publicToken}`}>Review proposal</Link>
                </Button>
              ) : null}
              {canPayNow ? <PayTripButton tripId={trip.id} label={payLabel} /> : null}
              {trip.status === "BOOKED" && trip.paidCents > 0 && trip.balanceCents > 0 ? (
                <p className="text-sm leading-6 text-slate-600">
                  Your balance is due before departure — we&apos;ll send a secure payment link.
                </p>
              ) : null}
              {trip.paidCents > 0 ? <BillingPortalButton /> : null}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function MoneyLine({
  label,
  cents,
  currency,
  strong = false,
}: {
  label: string;
  cents: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold text-primary" : "text-slate-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-primary" : "text-slate-800"}`}>
        {formatCentsAsCurrency(cents, { currency })}
      </dd>
    </div>
  );
}
