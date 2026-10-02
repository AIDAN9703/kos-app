import { notFound } from "next/navigation";

import { formatDistanceToNowStrict } from "date-fns";
import { auth } from "@/auth";
import { DealHeaderCard } from "@/features/bookings/components/admin/view-booking/DealHeaderCard";
import { DealRequestCard } from "@/features/bookings/components/admin/view-booking/DealRequestCard";
import { getDisplayKind } from "@/features/bookings/deal-presentation";
import { adminInitials } from "@/shared/lib/utils/people-display";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import {
  BookingTripCard,
  type BookingTripDetailsSnapshot,
} from "@/features/bookings/components/admin/view-booking/BookingTripCard";
import {
  BookingEditModeProvider,
  BookingPageEditButton,
} from "@/features/bookings/components/admin/view-booking/BookingEditMode";
import { CommissionCard } from "@/features/bookings/components/admin/view-booking/CommissionCard";
import { DealContactBand } from "@/features/bookings/components/admin/view-booking/DealContactBand";
import { BreakdownCard } from "@/features/bookings/components/admin/view-booking/BreakdownCard";
import type { SendToCustomerData } from "@/features/bookings/components/admin/view-booking/SendToCustomer";
import { customerMoney, dealEconomics } from "@/features/bookings/lib/booking-money";
import { DealActionsMenu } from "@/features/bookings/components/admin/view-booking/DealActionsMenu";
import { CreateProposalModal } from "@/features/bookings/components/admin/view-booking/CreateProposalModal";
import { ActivityComposer } from "@/features/bookings/components/admin/view-booking/ActivityComposer";
import { buildDealPrefillForBookingForm } from "@/features/bookings/lib/deal-prefill";
import { boatService } from "@/features/boats/boat.service";
import { BookingActivityTimeline } from "@/features/bookings/components/admin/view-booking/BookingActivityTimeline";
import {
  CharterPartyCard,
  type CharterPartyMember,
} from "@/features/bookings/components/admin/view-booking/CharterPartyCard";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";

import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingExpenseLineService } from "@/features/bookings/services/booking-expense-line.service";
import { bookingOpsService } from "@/features/bookings/services/booking-ops.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { bookingCrewService } from "@/features/bookings/services/booking-crew.service";
import { paymentService } from "@/features/payments/payment.service";
import { captainProfileService } from "@/features/profiles/captain-profile.service";
import { crewProfileService } from "@/features/profiles/crew-profile.service";
import { userService } from "@/features/users/user.service";

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

interface BookingDetailsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * ONE page for every deal. The same cards in the same places at every stage;
 * a card appears when it has something to show. Inquiry: header, what they
 * asked for, finances (estimate), activity. Booking: header, the trip (with
 * crew), commission, party (if any), finances (read-only breakdown), activity
 * (with completed payments). Edit trip turns the trip card into the whole
 * form — trip, pricing, add-ons, more boats — so all editing is on the left.
 * Nothing is shown twice.
 */
export default async function BookingDetailsPage({ params }: BookingDetailsPageProps) {
  const { id } = await params;
  const booking = await bookingService.getBookingById(id);
  if (!booking) {
    notFound();
  }

  const [
    ops,
    expenseLines,
    rawEvents,
    bookingPayments,
    captains,
    bookingCrewRows,
    crewPool,
    admins,
    session,
    pricingTiers,
    party,
  ] = await Promise.all([
    bookingOpsService.getByBookingId(id),
    bookingExpenseLineService.getLines(id),
    bookingEventsService.listByBookingId(id),
    paymentService.getBookingPayments(id),
    captainProfileService.getCaptainsForAssignment(),
    bookingCrewService.listByBookingId(id),
    crewProfileService.getCrewForAssignment(),
    userService.getAdmins(),
    auth(),
    // Inquiries get every boat's tiers (Create proposal); priced deals get
    // their own boat's tiers for the Edit trip form.
    booking.bookingStatus === "INQUIRY"
      ? boatService.getAllActivePricingTiers()
      : booking.boatId
        ? boatService.getBoatPricingTiers(booking.boatId).then((tiers) =>
            tiers
              .filter((t) => t.isActive)
              .map((t) => ({
                id: t.id,
                boatId: t.boatId,
                hours: t.hours,
                price: t.price,
                name: t.name,
                isDefault: t.isDefault,
              }))
          )
        : Promise.resolve([]),
    // Charter party: sibling boats sailing under the same group.
    booking.bookingGroupId ? bookingService.getChargeableParty(id) : Promise.resolve(null),
  ]);

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
  const stripeDashboardBase = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live")
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
        href: p.stripePaymentIntentId
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
    commissionAgentCents: ops?.commissionAgentCents ?? null,
    commissionKosCents: ops?.commissionKosCents ?? null,
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

  const kind = getDisplayKind(booking);
  const KindIcon = kind.Icon;

  return (
    <BookingEditModeProvider>
      <div className="flex w-full flex-1 flex-col">
        {/* Left: who + the trip + who runs it. Right: the money, then the
            story so far (sticky). Same grid on both faces. */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <DealHeaderCard
              eyebrow={`Booking #${booking.id.slice(0, 6).toUpperCase()}`}
              name={booking.customerName || "Unnamed customer"}
              avatarInitials={adminInitials(booking.customerName ?? "") || "?"}
              avatarImage={booking.userProfileImage}
              avatarClassName="bg-primary-soft text-primary-strong"
              typeChip={
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                    kind.badge
                  )}
                >
                  <KindIcon className="h-3 w-3" />
                  {kind.label}
                </span>
              }
              meta={
                // Just when. The source sits on the board; the trip is below.
                <>
                  Created{" "}
                  <span className="tabular-nums">
                    {formatDistanceToNowStrict(new Date(booking.createdAt))} ago
                  </span>
                </>
              }
              contact={
                <DealContactBand
                  bookingId={id}
                  name={booking.customerName}
                  email={booking.customerEmail}
                  phone={booking.customerPhone}
                  ownerName={ownerName}
                />
              }
              value={headline}
              actions={
                // Same anatomy for both stages: one primary verb + Edit + the
                // quiet ⋯ overflow. Inquiry's winning path is the proposal;
                // its Edit covers contact details only.
                <div className="flex shrink-0 items-center gap-2">
                  {isInquiry ? (
                    <>
                      <CreateProposalModal
                        pricingTiers={pricingTiers}
                        admins={admins}
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
                    currentUserId={session?.user?.id ?? null}
                  />
                </div>
              }
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
                <CommissionCard
                  economics={economics}
                  expenseLines={expenseLines}
                  commissionAgentCents={ops?.commissionAgentCents ?? null}
                  commissionKosCents={ops?.commissionKosCents ?? null}
                  currency={currency}
                />
                {partyMembers.length > 1 ? (
                  <CharterPartyCard
                    members={partyMembers}
                    currentBookingId={id}
                    groupName={booking.bookingGroupName ?? null}
                  />
                ) : null}
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-6">
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
            />
            {/* lg:top-0 — sticky enforces its top value even at rest; any
                positive offset misaligns the rail. Zero never can. */}
            <BookingActivityTimeline
              events={timeline}
              className="lg:sticky lg:top-0"
              actions={!isSettled ? <ActivityComposer bookingId={id} /> : undefined}
            />
          </div>
        </div>
      </div>
    </BookingEditModeProvider>
  );
}
