import { formatDistanceToNowStrict } from "date-fns";
import Image from "next/image";
import { Ship } from "lucide-react";
import { DealRequestCard } from "@/features/bookings/components/admin/view-booking/DealRequestCard";
import { getDisplayKind } from "@/features/bookings/deal-presentation";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import config from "@/shared/lib/config";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import {
  BookingTripCard,
  type BookingTripDetailsSnapshot,
} from "@/features/bookings/components/admin/view-booking/BookingTripCard";
import {
  BookingEditModeProvider,
  BookingPageEditButton,
} from "@/features/bookings/components/admin/view-booking/BookingEditMode";
import { RevenueCard } from "@/features/bookings/components/admin/view-booking/RevenueCard";
import { CustomerDetailsCard } from "@/features/bookings/components/admin/view-booking/CustomerDetailsCard";
import { BreakdownCard } from "@/features/bookings/components/admin/view-booking/BreakdownCard";
import type { SendToCustomerData } from "@/features/bookings/components/admin/view-booking/SendToCustomer";
import { customerMoney, dealEconomics } from "@/features/bookings/lib/booking-money";
import { DealActionsMenu } from "@/features/bookings/components/admin/view-booking/DealActionsMenu";
import { CreateProposalModal } from "@/features/bookings/components/admin/view-booking/CreateProposalModal";
import { ActivityComposer } from "@/features/bookings/components/admin/view-booking/ActivityComposer";
import { buildDealPrefillForBookingForm } from "@/features/bookings/lib/deal-prefill";
import { BookingActivityTimeline } from "@/features/bookings/components/admin/view-booking/BookingActivityTimeline";
import {
  CharterPartyCard,
  type CharterPartyMember,
} from "@/features/bookings/components/admin/view-booking/CharterPartyCard";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import type { DealPageData } from "@/features/bookings/deal.data";
import type { BookingActivityEventEntry } from "@/features/bookings/booking.types";

const PAYMENT_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  FULL_PAYMENT: "Payment",
  PARTIAL: "Payment",
  ADDITIONAL: "Additional charge",
  REFUND: "Refund",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE_CHECKOUT: "Card",
  STRIPE_LINK: "Card",
  STRIPE_INVOICE: "Card (invoice)",
  MANUAL: "Off-card",
};

/**
 * ONE page for every deal, a glass page like the person and boat pages: the
 * customer as the header, then the same panels in the same places at every
 * stage; a panel appears when it has something to show. Inquiry: what they
 * asked for, the estimate, activity. Booking: the trip (with crew), revenue,
 * party (if any), breakdown (read-only, with sending), activity (with
 * completed payments). Edit trip turns the trip panel into the whole form —
 * trip, pricing, add-ons, more boats — so all editing is on the left.
 * Nothing is shown twice.
 */
export async function DealPage({ deal }: { deal: DealPageData }) {
  const {
    viewer,
    booking,
    ops,
    expenseLines,
    events: rawEvents,
    payments: bookingPayments,
    captains,
    crew: bookingCrewRows,
    crewPool,
    admins,
    pricingTiers,
    party,
  } = deal;
  const id = booking.id;

  const partyMembers: CharterPartyMember[] =
    party && party.length > 1
      ? party.map((m) => ({
          id: m.booking.id,
          boatName: m.boat?.name ?? null,
          bookingStatus: m.booking.bookingStatus,
          startDateTime: m.booking.startDateTime,
          totalAmountCents: m.pricing ? Number(m.pricing.totalAmountCents) : null,
          boatTimezone: m.boat?.timezone ?? null,
        }))
      : [];

  // Link freshness: when did the customer last get the link, and how many
  // admin edits have landed since? Drives the Breakdown's "not sent yet" note.
  const SEND_EVENT_TYPES = new Set<string>([
    BOOKING_EVENT_TYPES.PROPOSAL_PUBLISHED,
    BOOKING_EVENT_TYPES.PROPOSAL_UPDATE_SENT,
  ]);
  // rawEvents are newest-first.
  const lastSendEvent = rawEvents.find((e) => SEND_EVENT_TYPES.has(e.eventType));
  const lastSentAt = lastSendEvent?.createdAt ?? booking.publishedAt ?? null;
  const changesSinceLastSend = lastSentAt
    ? rawEvents.filter(
        (e) =>
          e.eventType === BOOKING_EVENT_TYPES.UPDATED &&
          new Date(e.createdAt) > new Date(lastSentAt)
      ).length
    : 0;

  // ONE activity feed per deal — migrated lead history lives natively in
  // booking_event (lead.* event types), so no merging is needed.
  const activityEvents: BookingActivityEventEntry[] = rawEvents.map((e) => ({
    id: e.id,
    actorType: e.actorType,
    eventType: e.eventType,
    channel: e.channel,
    displayMessage: e.displayMessage,
    content: e.content,
    contactMethod: e.contactMethod,
    metadata: (e.metadata as Record<string, unknown> | null) ?? null,
    previousState: (e.previousState as Record<string, unknown> | null) ?? null,
    newState: (e.newState as Record<string, unknown> | null) ?? null,
    createdAt: e.createdAt,
    actorName:
      e.actorFirstName || e.actorLastName
        ? `${e.actorFirstName || ""} ${e.actorLastName || ""}`.trim()
        : e.actorEmail || (e.actorType === "system" ? "System" : "—"),
  }));

  // Completed payments read as activity ("Payment $2,450 ↗"). Pending and
  // failed attempts aren't shown anywhere — only money that actually moved.
  const stripeDashboardBase = config.stripeLive
    ? "https://dashboard.stripe.com"
    : "https://dashboard.stripe.com/test";
  const paymentEvents: BookingActivityEventEntry[] = bookingPayments
    .filter((p) => p.status === "SUCCEEDED")
    .map((p) => ({
      id: `payment-${p.id}`,
      actorType: "system",
      eventType: BOOKING_EVENT_TYPES.PAYMENT_RECEIVED,
      channel: null,
      displayMessage: null,
      content: null,
      contactMethod: null,
      metadata: null,
      createdAt: p.processedAt ?? p.createdAt,
      actorName: "—",
      payment: {
        label: PAYMENT_LABELS[p.paymentType] ?? "Payment",
        amountText: formatCentsAsCurrency(Number(p.amountCents), {
          currency: p.currency ?? booking.currency ?? "USD",
        }),
        isRefund: p.paymentType === "REFUND",
        method:
          p.paymentMethodDetail ?? PAYMENT_METHOD_LABELS[p.paymentMethodType] ?? "Payment",
        href:
          viewer.canSeeEconomics && p.stripePaymentIntentId
            ? `${stripeDashboardBase}/payments/${p.stripePaymentIntentId}`
            : null,
      },
    }));
  const timeline = [...activityEvents, ...paymentEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const captainOptions = [...captains];
  if (booking.captainUserId && !captains.some((c) => c.id === booking.captainUserId)) {
    captainOptions.unshift({
      id: booking.captainUserId,
      firstName: booking.captainFirstName,
      lastName: booking.captainLastName,
      email: booking.captainEmail ?? "",
    });
  }

  const crewOptions = [...crewPool];
  for (const row of bookingCrewRows) {
    if (!crewOptions.some((c) => c.id === row.userId)) {
      crewOptions.unshift({
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
      });
    }
  }

  const bookingCrew = bookingCrewRows.map((row) => ({
    id: row.id,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
  }));

  const tripSnapshot: BookingTripDetailsSnapshot = {
    numberOfPassengers: booking.numberOfPassengers,
    needsCaptain: booking.needsCaptain,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    startDateTime: booking.startDateTime ? booking.startDateTime.toISOString() : null,
    endDateTime: booking.endDateTime ? booking.endDateTime.toISOString() : null,
    boatTimezone: booking.boatTimezone,
    boatId: booking.boatId,
    boatName: booking.boatName,
    selectedBoat:
      booking.boatId != null
        ? {
            id: booking.boatId,
            name: booking.boatName ?? "",
            mainImage: booking.boatMainImage,
            capacity: booking.boatCapacity ?? 0,
            locationLabel: null,
            cleaningFee: null,
            depositAmount: null,
            crewRequired: null,
          }
        : null,
  };

  const isInquiry = booking.bookingStatus === "INQUIRY";
  // Settled deals are read-only history: no contact/note composer, no
  // customer-facing money links.
  const isSettled =
    booking.bookingStatus === "COMPLETED" || booking.bookingStatus === "CANCELLED";
  const isPriced = booking.totalAmountCents > 0;
  const ownerName = booking.assignedAdminId
    ? [booking.assignedAdminFirstName, booking.assignedAdminLastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      booking.assignedAdminEmail ||
      "Admin"
    : null;

  // ONE place for the money math — the header and Breakdown read these.
  const money = customerMoney({
    totalAmountCents: booking.totalAmountCents,
    serviceFeeCents: booking.serviceFeeCents,
    serviceFeeWaived: booking.serviceFeeWaived,
    totalPaidCents: booking.totalPaidCents,
    depositAmountCents: booking.depositAmountCents,
    latestPaymentStatus: booking.paymentStatus,
    hasRefund: booking.hasRefund,
  });
  const economics = dealEconomics({
    totalAmountCents: booking.totalAmountCents,
    serviceFeeCents: booking.serviceFeeCents,
    serviceFeeWaived: booking.serviceFeeWaived,
    opsGmvCents: ops?.gmvCents ?? null,
    opsExpenseCents: ops?.expenseCents ?? null,
  });
  const currency = booking.currency ?? "USD";
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency });

  // The customer's exact line items, as their link shows them.
  const lines = {
    boatName: booking.boatName,
    basePriceCents: booking.basePriceCents ?? 0,
    captainFeeCents: booking.captainFeeCents ?? 0,
    cleaningFeeCents: booking.cleaningFeeCents ?? 0,
    addOns: booking.addOns ?? [],
  };

  // One customer link per deal; sendable while it exists and money or a
  // decision is still outstanding. Stage names what the link IS to them now.
  const sendToCustomer: SendToCustomerData | null =
    booking.publicToken &&
    !isSettled &&
    (booking.bookingStatus === "PROPOSED" || money.balanceCents > 0)
      ? {
          bookingId: id,
          publicToken: booking.publicToken,
          stage: booking.bookingStatus === "PROPOSED" ? "proposal" : "payment",
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          lastSentAt: lastSentAt ? new Date(lastSentAt).toISOString() : null,
          editsSinceSend: changesSinceLastSend,
          serviceFeeWaived: money.serviceFeeWaived,
        }
      : null;

  const adminOptions = admins.map((a) => ({
    id: a.id,
    name:
      [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || a.email || "Unknown admin",
  }));

  // Headline money: the one number for this stage. Inquiry = what it might be
  // worth; proposal = what we asked for; booked = what's still owed (or Paid).
  const headline = isInquiry
    ? booking.estimatedValueCents != null
      ? { label: "Est. value", text: fmt(booking.estimatedValueCents) }
      : booking.budgetCents != null
        ? { label: "Budget", text: fmt(booking.budgetCents) }
        : null
    : !isPriced
      ? null
      : booking.bookingStatus === "PROPOSED"
        ? { label: "Total", text: fmt(money.totalCents) }
        : money.balanceCents > 0
          ? { label: "Balance due", text: fmt(money.balanceCents) }
          : { label: "Paid", text: fmt(money.paidCents) };

  return (
    <BookingEditModeProvider>
      <GlassPage>
        {/* The boat's photo, what the deal is ("Inquiry #…", "Booking #…"),
            the customer and when it came in. Contact details, the trip and
            the money are panels below. */}
        <GlassHeader
          leading={
            <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-glass-strong ring-2 ring-glass-border">
              {booking.boatMainImage ? (
                <Image src={booking.boatMainImage} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <Ship className="size-6 text-muted-foreground" />
              )}
            </span>
          }
          eyebrow={`${getDisplayKind(booking).label} #${booking.id.slice(0, 6).toUpperCase()}`}
          title={booking.customerName || "Unnamed customer"}
          meta={
            // Just when. The source sits on the board; the trip is below.
            <span>
              Created{" "}
              <span className="tabular-nums">
                {formatDistanceToNowStrict(new Date(booking.createdAt))} ago
              </span>
            </span>
          }
          actions={
            // The stage's one number, then the same verbs on both stages: one
            // primary verb + Edit + the quiet ⋯ overflow. Inquiry's winning
            // path is the proposal; its Edit covers contact details only.
            <>
              {headline ? (
                <div className="mr-3 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {headline.label}
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{headline.text}</p>
                </div>
              ) : null}
              {isInquiry ? (
                <>
                  <CreateProposalModal
                    pricingTiers={pricingTiers}
                    dealPrefill={buildDealPrefillForBookingForm(booking)}
                  />
                  <BookingPageEditButton label="Edit contact" />
                </>
              ) : (
                <BookingPageEditButton />
              )}
              <DealActionsMenu
                bookingId={id}
                bookingStatus={booking.bookingStatus}
                isArchived={booking.archivedAt != null}
                assignedAdminId={booking.assignedAdminId}
                admins={adminOptions}
                canAssign={viewer.canAssign}
                currentUserId={viewer.userId}
              />
            </>
          }
        />

        {/* Left: the customer, the trip and who runs it. Right: the money,
            then the story so far (sticky). Same grid on both faces. */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <CustomerDetailsCard
              bookingId={id}
              name={booking.customerName}
              email={booking.customerEmail}
              phone={booking.customerPhone}
              ownerName={ownerName}
            />
            {isInquiry ? (
              <DealRequestCard deal={booking} />
            ) : (
              <>
                <BookingTripCard
                  bookingId={id}
                  partySize={partyMembers.length || 1}
                  trip={tripSnapshot}
                  captainUserId={booking.captainUserId}
                  captainFirstName={booking.captainFirstName}
                  captainLastName={booking.captainLastName}
                  captainEmail={booking.captainEmail}
                  captainOptions={captainOptions}
                  bookingCrew={bookingCrew}
                  crewOptions={crewOptions}
                  pricing={
                    isPriced
                      ? {
                          editable: !isSettled,
                          currency,
                          money,
                          basePriceCents: lines.basePriceCents,
                          captainFeeCents: lines.captainFeeCents,
                          cleaningFeeCents: lines.cleaningFeeCents,
                          addOns: lines.addOns,
                          pricingTierId: booking.pricingTierId,
                          tiers: pricingTiers,
                        }
                      : null
                  }
                  canAddBoat={["PROPOSED", "BOOKED"].includes(booking.bookingStatus)}
                />
                {viewer.canSeeEconomics ? (
                  <RevenueCard
                    economics={economics}
                    expenseLineCount={expenseLines.length}
                    currency={currency}
                  />
                ) : null}
                {partyMembers.length > 1 ? (
                  <CharterPartyCard
                    members={partyMembers}
                    currentBookingId={id}
                    groupName={booking.bookingGroupName ?? null}
                    basePath={viewer.basePath}
                  />
                ) : null}
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <BreakdownCard
              bookingId={id}
              isInquiry={isInquiry}
              money={money}
              lines={lines}
              expenseLines={expenseLines}
              opsGmvCents={ops?.gmvCents ?? null}
              totalAmountCents={booking.totalAmountCents ?? null}
              serviceFeeCents={booking.serviceFeeCents ?? null}
              currency={currency}
              estimatedValueCents={booking.estimatedValueCents ?? null}
              budgetCents={booking.budgetCents ?? null}
              send={sendToCustomer}
              canEditExpenses={viewer.canSeeEconomics}
              canRecordPayments={viewer.canRecordPayments}
            />
            {/* Sticks a little below the top bar while the left side scrolls. */}
            <BookingActivityTimeline
              events={timeline}
              className="lg:sticky lg:top-6"
              actions={!isSettled ? <ActivityComposer bookingId={id} /> : undefined}
            />
          </div>
        </div>
      </GlassPage>
    </BookingEditModeProvider>
  );
}
