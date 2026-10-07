import "server-only";

import Stripe from "stripe";
import { eq, and } from "drizzle-orm";

import { db } from "@/database/db";
import { bookings, bookingPricing, payments, boats } from "@/database/schema";
import type { PaymentStatus } from "@/database/types";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import { alertTeam } from "@/features/bookings/lib/team-alerts";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { confirmPaidBooking, type ConfirmOutcome } from "@/features/bookings/services/confirm-paid-booking.service";
import { fulfillInstantCheckoutSession } from "@/features/bookings/services/instant-checkout-fulfillment.service";
import { netPaidCents, paymentService } from "@/features/payments/payment.service";
import { allocateRefunds, splitProportionally } from "@/features/payments/refund-allocation";
import {
  claimStripeEvent,
  markStripeEventFailed,
  markStripeEventIgnored,
  markStripeEventProcessed,
} from "@/features/payments/stripe-event.service";
import config from "@/shared/lib/config";
import { UserFacingError } from "@/shared/lib/errors";
import { sendBookingConfirmationEmail } from "@/shared/lib/services/email.service";
import { getStripe } from "@/shared/lib/services/stripe.service";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";

/**
 * Settling card payments with Stripe: the webhook (primary) and the
 * payment-success page's verify call (the fallback when the webhook can't
 * reach us). Server-only and not access-checked: payments.data.ts verifies
 * the caller first (Stripe's signature, or a real checkout session id).
 *
 * Every handler is safe to run twice: Stripe delivers at least once, retries
 * for days, and doesn't guarantee order. Refunds and disputes re-read the
 * truth from Stripe rather than trusting one event's numbers.
 */

// ============================================================================
// WEBHOOK
// ============================================================================

/**
 * The event, when its signature matches one of our webhook secrets;
 * otherwise null. Both modes' secrets are accepted because Stripe's test and
 * live endpoints can point at the same URL: a genuine event from the other
 * mode is then acknowledged and ignored (processStripeEvent), rather than
 * rejected and retried for days.
 */
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event | null {
  const secrets = [
    config.stripeWebhookSecret,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_LIVE_WEBHOOK_SECRET,
  ].filter((s, i, all): s is string => Boolean(s) && all.indexOf(s) === i);

  for (const secret of secrets) {
    try {
      return getStripe().webhooks.constructEvent(body, signature, secret);
    } catch {
      // Try the next secret
    }
  }
  console.error("[Webhook] Signature verification failed");
  return null;
}

/**
 * Settle one verified webhook event, once. Throws so Stripe retries when our
 * records didn't update, or when another delivery of the same event is still
 * being handled.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  // Live keys take live events only, test keys test events only: a test
  // payment must never confirm a real booking.
  if (event.livemode !== config.stripeLive) {
    const reason = `Ignored: ${event.livemode ? "live" : "test"}-mode event on a ${config.stripeLive ? "live" : "test"} deployment`;
    console.warn(`[Webhook] ${event.type} ${event.id} — ${reason}`);
    await markStripeEventIgnored(event, reason);
    return;
  }

  const claim = await claimStripeEvent(event);
  if (claim === "already_processed") {
    console.log(`[Webhook] ${event.type} ${event.id} already processed — skipping`);
    return;
  }
  if (claim === "in_progress") {
    throw new UserFacingError("This event is already being processed", 409);
  }

  console.log(`[Webhook] ${event.type} (id: ${event.id})`);
  try {
    await dispatch(event);
    await markStripeEventProcessed(event.id);
  } catch (error) {
    await markStripeEventFailed(event.id, error).catch((e) =>
      console.error("[Webhook] Recording the failure failed:", e)
    );
    throw error;
  }
}

async function dispatch(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Card payments are paid by now. A bank debit completes the session
      // first and pays days later (async_payment_succeeded / _failed).
      if (session.payment_status === "unpaid") {
        await paymentService.setStatusForSession(session.id, ["PENDING"], "PROCESSING");
        console.log(`[Webhook] Session ${session.id} completed, payment still processing`);
        return;
      }
      await handleCheckoutPaid(session);
      return;
    }
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutPaid(event.data.object);
      return;
    case "checkout.session.async_payment_failed":
      await handleCheckoutPaymentFailed(event.data.object);
      return;
    case "checkout.session.expired":
      // The guest walked away; the link's pending rows are void.
      await paymentService.setStatusForSession(event.data.object.id, ["PENDING"], "CANCELLED");
      return;
    case "charge.refunded":
    case "refund.created":
    case "refund.updated":
    case "refund.failed":
      await syncRefunds(intentIdOf(event.data.object.payment_intent));
      return;
    case "charge.dispute.created":
      await handleDispute(event.data.object, "opened");
      return;
    case "charge.dispute.closed":
      await handleDispute(event.data.object, "closed");
      return;
    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }
}

function intentIdOf(value: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

// ============================================================================
// CHECKOUT — paid (one handler for every checkout flow)
// ============================================================================

async function handleCheckoutPaid(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};

  // A charter-party checkout writes one payment row per booking against this
  // session; skip only when EVERY row already settled.
  const existingPayments = await paymentService.getPaymentsByStripeCheckoutSessionId(session.id);
  if (existingPayments.length > 0 && existingPayments.every((p) => p.status === "SUCCEEDED")) {
    console.log(`[Webhook] Session ${session.id} already settled — skipping`);
    return;
  }

  if (metadata.bookingType === "INSTANT_BOOK") {
    await handleInstantBooking(session, existingPayments[0] ?? null);
  } else {
    // Proposal pay-now or payment-link flows
    await handleBookingPayment(session, existingPayments);
  }
}

/** A bank debit that didn't go through: the rows fail and the team hears about it. */
async function handleCheckoutPaymentFailed(session: Stripe.Checkout.Session) {
  const failed = await paymentService.setStatusForSession(session.id, ["PENDING", "PROCESSING"], "FAILED");
  const bookingId = session.metadata?.bookingId || failed[0]?.payableId;
  const booking = bookingId ? await bookingService.getBookingById(bookingId) : null;
  await alertTeam({
    subject: `Payment failed — ${booking?.customerName ?? session.customer_details?.name ?? "a customer"}`,
    heading: "A bank payment didn't go through",
    booking,
    extraLines: [
      {
        label: "Amount",
        value:
          session.amount_total != null
            ? formatCentsAsCurrency(session.amount_total, { currency: (session.currency ?? "usd").toUpperCase() })
            : null,
      },
    ],
    note: "The booking was not confirmed by this payment. Send the customer a new payment link.",
  });
}

// ============================================================================
// INSTANT BOOKING
// ============================================================================

async function handleInstantBooking(
  session: Stripe.Checkout.Session,
  existingPayment: Awaited<ReturnType<typeof paymentService.getPaymentByStripeCheckoutSessionId>>
) {
  try {
    // Fulfillment creates the row, sends the customer confirmation, and
    // alerts the team (once, from whichever of webhook/verify gets there first).
    const result = await fulfillInstantCheckoutSession(session, existingPayment);

    if (result.status === "skipped") {
      console.error(`[Webhook] Instant booking skipped: ${result.reason}`);
      return;
    }
  } catch (error) {
    console.error("[Webhook] handleInstantBooking error:", error);
    throw error;
  }
}

// ============================================================================
// BOOKING PAYMENT (proposal pay-now, any checkout-based payment)
// ============================================================================

async function handleBookingPayment(
  session: Stripe.Checkout.Session,
  existingPayments: Awaited<ReturnType<typeof paymentService.getPaymentsByStripeCheckoutSessionId>>
) {
  try {
    const metadata = session.metadata || {};
    const paymentIntentId = session.payment_intent as string;

    // Resolve the lead booking ID from multiple sources
    let bookingId: string | undefined = metadata.bookingId;

    // Fallback: look up from existing payment records (matched by checkout session)
    if (!bookingId && existingPayments.length > 0) {
      bookingId = existingPayments[0].payableId;
    }

    // Fallback: look up by payment link ID (legacy Payment Link flows)
    if (!bookingId && session.payment_link) {
      const paymentLinkId =
        typeof session.payment_link === "string" ? session.payment_link : session.payment_link.id;

      const byLink = await db
        .select({ payableId: payments.payableId })
        .from(payments)
        .where(
          and(eq(payments.stripePaymentLinkId, paymentLinkId), eq(payments.payableType, "BOOKING"))
        )
        .limit(1);

      if (byLink.length > 0) bookingId = byLink[0].payableId;
    }

    if (!bookingId) {
      console.warn("[Webhook] Could not resolve bookingId for checkout session", session.id);
      return;
    }

    // Settle EVERY payment row on this session (a charter party has one per
    // boat) and backfill the shared intent id for refund handling.
    for (const payment of existingPayments) {
      if (payment.status !== "SUCCEEDED") {
        await paymentService.markPaymentSucceeded(payment.id, paymentIntentId);
      } else if (!payment.stripePaymentIntentId && paymentIntentId) {
        await paymentService.updatePayment(payment.id, {
          stripePaymentIntentId: paymentIntentId,
        });
      }
    }

    if (existingPayments.length === 0) {
      // Legacy fallback: look up payment by payment link ID
      const paymentLinkId =
        typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;

      if (paymentLinkId) {
        const linkPayment = await paymentService.getPaymentByStripePaymentLinkId(paymentLinkId);
        if (linkPayment) {
          await paymentService.markPaymentSucceeded(linkPayment.id, paymentIntentId);
          await paymentService.updatePayment(linkPayment.id, {
            stripeCheckoutSessionId: session.id,
          });
        }
      }
    }

    // Book the WHOLE party: the paid rows plus any group sibling (a boat
    // with no deposit configured has no payment row in deposit mode, but its
    // slot is just as sold).
    const bookingIdsToBook = new Set<string>([
      bookingId,
      ...existingPayments.map((p) => p.payableId),
      ...(await bookingService.getPartyIds(bookingId)),
    ]);
    // Only proposals become booked; cancelled deals are never revived and a
    // taken slot is held for an admin (see confirmPaidBooking).
    const outcomes = new Map<string, ConfirmOutcome>();
    for (const id of bookingIdsToBook) {
      outcomes.set(id, await confirmPaidBooking(id, "Payment received"));
    }
    const problems = [...outcomes.values()].filter((o) => o === "held" || o === "not_bookable");

    console.log(
      `[Webhook] checkout ${session.id}: ${[...outcomes.entries()].map(([id, o]) => `${id}=${o}`).join(", ")}`
    );

    const kindLabel: Record<string, string> = {
      DEPOSIT: "Deposit",
      PARTIAL: "Remaining balance",
      FULL_PAYMENT: "Full payment",
    };

    // ONE confirmation email for the lead booking (only when it's really
    // booked) and ONE team alert.
    const booking = await bookingService.getBookingById(bookingId);
    if (booking) {
      if (problems.length === 0) {
        await sendBookingConfirmationEmail(booking).catch((e) =>
          console.warn("[Webhook] Confirmation email failed:", e)
        );
      }
      await alertTeam({
        subject:
          problems.length > 0
            ? `⚠ Payment needs attention — ${booking.customerName}`
            : `Payment received — ${booking.customerName}${booking.boatName ? ` · ${booking.boatName}` : ""}`,
        heading:
          problems.length > 0
            ? "Payment received, but the booking couldn't be confirmed"
            : "Payment received (card)",
        booking,
        extraLines: [
          {
            label: "Amount",
            value:
              session.amount_total != null
                ? formatCentsAsCurrency(session.amount_total, {
                    currency: (session.currency ?? "usd").toUpperCase(),
                  })
                : null,
          },
          { label: "Type", value: kindLabel[metadata.paymentRecordType ?? ""] ?? "Payment" },
          { label: "Boats", value: bookingIdsToBook.size > 1 ? `${bookingIdsToBook.size} (charter party)` : null },
        ],
        note:
          problems.length > 0
            ? "The date was taken by another booking, or the booking was cancelled. Resolve it on the booking page and refund if needed."
            : undefined,
      });
    }
  } catch (error) {
    console.error("[Webhook] handleBookingPayment error:", error);
    // Rethrow so Stripe retries — payment succeeded but our records didn't update.
    throw error;
  }
}

// ============================================================================
// REFUNDS
// ============================================================================

const REFUND_STATUS: Record<string, PaymentStatus> = {
  succeeded: "SUCCEEDED",
  pending: "PENDING",
  requires_action: "PENDING",
  failed: "FAILED",
  canceled: "CANCELLED",
};

/** Refunds that are giving (or have given) money back. */
const isLiveRefund = (refund: Stripe.Refund) =>
  refund.status === "succeeded" || refund.status === "pending" || refund.status === "requires_action";

/**
 * Bring our refund rows for one payment in line with Stripe. Stripe's list of
 * refunds is the truth: each refund becomes one REFUND row per charge row (a
 * charter party's payment is shared across its boats), keyed by the refund
 * id, so a repeated or out-of-order event changes nothing and a refund that
 * fails later is marked failed. Refunds are issued in the Stripe Dashboard.
 *
 * When the whole payment has been given back, its bookings (and party
 * siblings) that kept no money are cancelled; a refund of one charge never
 * cancels a booking that still holds another payment.
 */
async function syncRefunds(paymentIntentId: string | null) {
  if (!paymentIntentId) {
    console.warn("[Webhook] Refund event without a payment intent");
    return;
  }
  const chargeRows = await paymentService.getChargeRowsForIntent(paymentIntentId);
  if (chargeRows.length === 0) {
    console.warn(`[Webhook] Refund for intent ${paymentIntentId}, which pays for nothing we know`);
    return;
  }

  const refunds = (
    await getStripe().refunds.list({ payment_intent: paymentIntentId, limit: 100 }).autoPagingToArray({ limit: 1000 })
  ).sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));

  // Rows written before refunds were keyed by id (they held Stripe's running
  // total, so a second partial refund counted twice). Stripe's list replaces them.
  await paymentService.deleteUnkeyedRefundRows(paymentIntentId);

  const weights = chargeRows.map((row) => Number(row.amountCents));
  const live = refunds.filter(isLiveRefund);
  const liveShares = new Map(allocateRefunds(weights, live.map((r) => r.amount)).map((s, i) => [live[i].id, s]));

  for (const refund of refunds) {
    const shares = liveShares.get(refund.id) ?? splitProportionally(refund.amount, weights);
    const status = REFUND_STATUS[refund.status ?? ""] ?? "PENDING";
    for (const [i, row] of chargeRows.entries()) {
      if (shares[i] > 0) {
        await paymentService.upsertRefund({
          refundedPayment: row,
          stripeRefundId: refund.id,
          amountCents: shares[i],
          status,
          processedAt: new Date(refund.created * 1000),
          notes: refund.reason ? `Stripe refund (${refund.reason.replace(/_/g, " ")})` : "Stripe refund",
        });
      } else {
        await paymentService.deleteRefundShare(refund.id, row.id);
      }
    }
  }

  const refundedCents = refunds.filter((r) => r.status === "succeeded").reduce((sum, r) => sum + r.amount, 0);
  const chargedCents = weights.reduce((sum, w) => sum + w, 0);
  console.log(`[Webhook] Refunds synced for ${paymentIntentId}: ${refundedCents} of ${chargedCents} cents refunded`);
  if (refundedCents < chargedCents) return;

  const candidates = new Set(chargeRows.filter((r) => r.payableType === "BOOKING").map((r) => r.payableId));
  for (const id of [...candidates]) {
    for (const sibling of await bookingService.getPartyIds(id)) candidates.add(sibling);
  }
  for (const id of candidates) {
    const [booking] = await db
      .select({ status: bookings.bookingStatus })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (booking?.status !== "PROPOSED" && booking?.status !== "BOOKED") continue;
    if (netPaidCents(await paymentService.getBookingPayments(id)) > 0) continue;
    await bookingStatusService.cancel(id, "Payment fully refunded via Stripe");
  }
}

// ============================================================================
// DISPUTES (chargebacks)
// ============================================================================

const DISPUTE_RESOLVED_FOR_US = new Set(["won", "warning_closed", "prevented"]);

/**
 * A disputed payment stops counting as paid while the bank decides (its rows
 * go to CHARGEBACK) and counts again if we win. The team is alerted both
 * times: evidence has a deadline, and it's submitted in the Stripe Dashboard.
 */
async function handleDispute(dispute: Stripe.Dispute, phase: "opened" | "closed") {
  const paymentIntentId = intentIdOf(dispute.payment_intent);
  if (!paymentIntentId) return;
  const rows = await paymentService.getChargeRowsForIntent(paymentIntentId);
  if (rows.length === 0) {
    console.warn(`[Webhook] Dispute ${dispute.id} on intent ${paymentIntentId}, which pays for nothing we know`);
    return;
  }

  const wonOrDropped = phase === "closed" && DISPUTE_RESOLVED_FOR_US.has(dispute.status);
  if (phase === "opened") {
    await paymentService.setChargeStatusForIntent(paymentIntentId, ["SUCCEEDED"], "CHARGEBACK");
  } else if (wonOrDropped) {
    await paymentService.setChargeStatusForIntent(paymentIntentId, ["CHARGEBACK"], "SUCCEEDED");
  }

  const amount = formatCentsAsCurrency(dispute.amount, { currency: dispute.currency.toUpperCase() });
  const reason = dispute.reason.replace(/_/g, " ");
  const message =
    phase === "opened"
      ? `Payment disputed by the customer's bank (${amount}, ${reason})`
      : `Dispute closed: ${wonOrDropped ? "resolved in our favour" : "lost — the money was returned to the customer"}`;
  const bookingIds = [...new Set(rows.filter((r) => r.payableType === "BOOKING").map((r) => r.payableId))];
  for (const bookingId of bookingIds) {
    await bookingEventsService.logEvent({
      bookingId,
      eventType: phase === "opened" ? BOOKING_EVENT_TYPES.DISPUTE_OPENED : BOOKING_EVENT_TYPES.DISPUTE_CLOSED,
      actorType: "system",
      channel: "stripe",
      displayMessage: message,
      metadata: {
        disputeId: dispute.id,
        status: dispute.status,
        amountCents: dispute.amount,
        reason: dispute.reason,
        evidenceDueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : null,
      },
    });
  }

  const booking = bookingIds[0] ? await bookingService.getBookingById(bookingIds[0]) : null;
  const dueBy = dispute.evidence_details?.due_by;
  await alertTeam({
    subject:
      phase === "opened"
        ? `⚠ Payment disputed — ${booking?.customerName ?? amount}`
        : `Dispute ${wonOrDropped ? "won" : "lost"} — ${booking?.customerName ?? amount}`,
    heading: phase === "opened" ? "A customer disputed a card payment" : "A payment dispute was closed",
    booking,
    extraLines: [
      { label: "Amount", value: amount },
      { label: "Reason", value: reason },
      { label: "Status", value: dispute.status.replace(/_/g, " ") },
      {
        label: "Evidence due",
        value: phase === "opened" && dueBy ? new Date(dueBy * 1000).toLocaleString("en-US", { timeZone: "America/New_York" }) : null,
      },
    ],
    note:
      phase === "opened"
        ? "Respond in the Stripe Dashboard (Payments → Disputes) before the evidence deadline, or the bank decides without us."
        : undefined,
  });
}

// ============================================================================
// VERIFY (the payment-success page)
// ============================================================================

export type CheckoutVerification =
  | { processing: true; message: string }
  | {
      processing: false;
      bookingId: string;
      booking: {
        id: string;
        bookingType: string;
        customerName: string;
        startDateTime: Date | null;
        endDateTime: Date | null;
        numberOfPassengers: number | null;
        boatName: string | null;
        boatCategory: string | null;
        boatMainImage: string | null;
        boatTimezone: string | null;
        totalAmountCents: number | null;
        basePriceCents: number | null;
        cleaningFeeCents: number | null;
        serviceFeeCents: number | null;
        captainFeeCents: number | null;
        depositAmountCents: number | null;
        paidNowCents: number;
        totalPaidCents: number;
        remainingCents: number;
      } | null;
    };

/**
 * Confirm a completed checkout from the success page: settle its payment
 * rows and book the party if the webhook hasn't, and report what was paid.
 */
export async function verifyCheckoutSession(sessionId: string): Promise<CheckoutVerification> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (session.status !== "complete") {
    throw new UserFacingError("Payment not completed");
  }
  // A bank debit completes checkout days before the money arrives; the
  // webhook books it then (checkout.session.async_payment_succeeded).
  if (session.payment_status === "unpaid") {
    return {
      processing: true,
      message: "Your bank payment is processing. We'll email you as soon as it clears.",
    };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const paymentLinkId =
    typeof session.payment_link === "string"
      ? session.payment_link
      : (session.payment_link?.id ?? null);

  let bookingId: string | null = null;

  const bySession = await db
    .select({ payableId: payments.payableId })
    .from(payments)
    .where(
      and(eq(payments.stripeCheckoutSessionId, sessionId), eq(payments.payableType, "BOOKING"))
    )
    .limit(1);
  if (bySession.length > 0) bookingId = bySession[0].payableId;

  if (!bookingId && paymentLinkId) {
    const byLink = await db
      .select({ payableId: payments.payableId })
      .from(payments)
      .where(
        and(eq(payments.stripePaymentLinkId, paymentLinkId), eq(payments.payableType, "BOOKING"))
      )
      .limit(1);
    if (byLink.length > 0) bookingId = byLink[0].payableId;
  }

  if (!bookingId && paymentIntentId) {
    const byIntent = await db
      .select({ payableId: payments.payableId })
      .from(payments)
      .where(
        and(
          eq(payments.stripePaymentIntentId, paymentIntentId),
          eq(payments.payableType, "BOOKING")
        )
      )
      .limit(1);
    if (byIntent.length > 0) bookingId = byIntent[0].payableId;
  }

  if (!bookingId) {
    const existingPayment = await paymentService.getPaymentByStripeCheckoutSessionId(sessionId);

    if (session.metadata?.bookingType === "INSTANT_BOOK") {
      const fulfillment = await fulfillInstantCheckoutSession(session, existingPayment, {
        sendConfirmationEmail: false,
      });

      if (fulfillment.status === "created" || fulfillment.status === "already_processed") {
        bookingId = fulfillment.bookingId;
      }

      // "created" means WE did the fulfillment — the webhook will see the
      // settled payment and skip, so the confirmation email is ours to send.
      if (fulfillment.status === "created") {
        const fullBooking = await bookingService.getBookingById(fulfillment.bookingId);
        if (fullBooking) {
          await sendBookingConfirmationEmail(fullBooking).catch((e) =>
            console.warn("[Verify] Instant-book confirmation email failed:", e)
          );
        }
      }
    }

    if (!bookingId) return { processing: true, message: "Payment successful — booking is still processing." };
  }
  return buildVerifyResult(bookingId, paymentIntentId, sessionId);
}

async function buildVerifyResult(
  bookingId: string,
  paymentIntentId?: string | null,
  sessionId?: string | null
): Promise<CheckoutVerification> {
  const [booking] = await db
    .select({
      id: bookings.id,
      bookingStatus: bookings.bookingStatus,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return { processing: true, message: "Booking is still processing." };

  // Confirm the booking AND its charter-party siblings — a group checkout
  // sells every boat in the party, and the webhook may never reach us.
  const partyIds = new Set<string>([bookingId, ...(await bookingService.getPartyIds(bookingId))]);

  // Only proposals become booked: a cancelled or completed booking is never
  // revived by reloading an old success link, and a taken slot is held.
  const outcomes = new Map<string, ConfirmOutcome>();
  for (const id of partyIds) {
    outcomes.set(id, await confirmPaidBooking(id, "Payment verified"));
  }
  const confirmed = [...outcomes.values()].every((o) => o === "booked" || o === "unchanged");

  // Settle the payment rows. The webhook is the primary settler, but when it
  // can't reach us (localhost, misconfigured endpoint) this is the only shot.
  // A charter-party checkout writes one PENDING row per boat, all sharing the
  // session id — settle every one and backfill the shared intent id.
  let settledAny = false;
  const sessionPayments = sessionId
    ? await paymentService.getPaymentsByStripeCheckoutSessionId(sessionId)
    : [];
  if (sessionPayments.length > 0) {
    for (const payment of sessionPayments) {
      if (payment.status !== "SUCCEEDED") {
        await paymentService.markPaymentSucceeded(payment.id, paymentIntentId ?? undefined);
        settledAny = true;
      }
    }
  } else if (paymentIntentId) {
    const payment = await paymentService.getPaymentByStripeIntentId(paymentIntentId);
    if (payment && payment.status !== "SUCCEEDED") {
      await paymentService.markPaymentSucceeded(payment.id);
      settledAny = true;
    }
  }

  // If we did the settling, the webhook never ran — send the confirmation
  // email here. When the webhook already settled, it also already sent it.
  if (settledAny) {
    const fullBooking = await bookingService.getBookingById(bookingId);
    if (fullBooking) {
      if (confirmed) {
        await sendBookingConfirmationEmail(fullBooking).catch((e) =>
          console.warn("[Verify] Confirmation email failed:", e)
        );
      }
      const settledCents = sessionPayments.reduce((sum, p) => sum + Number(p.amountCents), 0);
      await alertTeam({
        subject: `Payment received — ${fullBooking.customerName}${fullBooking.boatName ? ` · ${fullBooking.boatName}` : ""}`,
        heading: "Payment received (card)",
        booking: fullBooking,
        extraLines: [
          {
            label: "Amount",
            value: settledCents > 0 ? formatCentsAsCurrency(settledCents, { currency: fullBooking.currency ?? "USD" }) : null,
          },
        ],
      });
    }
  }

  // What the guest actually paid — today's session and everything so far,
  // net of refunds — so the thank-you page never presents the total as "paid".
  const bookingPayments = await paymentService.getBookingPayments(bookingId);
  const totalPaidCents = netPaidCents(bookingPayments);
  const paidNowCents = sessionId
    ? bookingPayments
        .filter((p) => p.status === "SUCCEEDED" && p.paymentType !== "REFUND" && p.stripeCheckoutSessionId === sessionId)
        .reduce((sum, p) => sum + Number(p.amountCents), 0)
    : 0;

  const [details] = await db
    .select({
      id: bookings.id,
      bookingType: bookings.bookingType,
      customerName: bookings.customerName,
      startDateTime: bookings.startDateTime,
      endDateTime: bookings.endDateTime,
      numberOfPassengers: bookings.numberOfPassengers,
      boatName: boats.name,
      boatCategory: boats.category,
      boatMainImage: boats.mainImage,
      boatTimezone: boats.timezone,
      totalAmountCents: bookingPricing.totalAmountCents,
      basePriceCents: bookingPricing.basePriceCents,
      cleaningFeeCents: bookingPricing.cleaningFeeCents,
      serviceFeeCents: bookingPricing.serviceFeeCents,
      serviceFeeWaived: bookingPricing.serviceFeeWaived,
      captainFeeCents: bookingPricing.captainFeeCents,
      depositAmountCents: bookingPricing.depositAmountCents,
    })
    .from(bookings)
    .leftJoin(boats, eq(bookings.boatId, boats.id))
    .leftJoin(bookingPricing, eq(bookings.id, bookingPricing.bookingId))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  return {
    processing: false,
    bookingId,
    booking: details
      ? {
          id: details.id,
          bookingType: details.bookingType,
          customerName: details.customerName,
          startDateTime: details.startDateTime,
          endDateTime: details.endDateTime,
          numberOfPassengers: details.numberOfPassengers,
          boatName: details.boatName,
          boatCategory: details.boatCategory,
          boatMainImage: details.boatMainImage,
          boatTimezone: details.boatTimezone,
          totalAmountCents: details.totalAmountCents ? Number(details.totalAmountCents) : null,
          basePriceCents: details.basePriceCents ? Number(details.basePriceCents) : null,
          cleaningFeeCents: details.cleaningFeeCents ? Number(details.cleaningFeeCents) : null,
          serviceFeeCents: details.serviceFeeCents ? Number(details.serviceFeeCents) : null,
          captainFeeCents: details.captainFeeCents ? Number(details.captainFeeCents) : null,
          depositAmountCents: details.depositAmountCents
            ? Number(details.depositAmountCents)
            : null,
          paidNowCents,
          totalPaidCents,
          remainingCents: Math.max(
            0,
            (details.totalAmountCents ? Number(details.totalAmountCents) : 0) -
              (details.serviceFeeWaived ? Number(details.serviceFeeCents ?? 0) : 0) -
              totalPaidCents
          ),
        }
      : null,
  };
}
