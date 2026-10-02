import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/database/db";
import { bookings, bookingStatusHistory, payments } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import config from "@/shared/lib/config";
import type { BookingStatus } from "@/database/types";
import { getStripe, getInvoicePaymentIntentId } from "@/shared/lib/services/stripe.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { paymentService } from "@/features/payments/payment.service";
import { sendBookingConfirmationEmail } from "@/shared/lib/services/email.service";
import { alertTeam } from "@/features/bookings/lib/team-alerts";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { fulfillInstantCheckoutSession } from "@/features/bookings/services/instant-checkout-fulfillment.service";
import { confirmPaidBooking, type ConfirmOutcome } from "@/features/bookings/lib/confirm-paid-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = config.stripeWebhookSecret;

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await (await request.blob()).text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    const event = verifyWebhookSignature(body, signature);
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log(`[Webhook] ${event.type} (id: ${event.id}, livemode: ${event.livemode})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    endpoint: "/api/webhook/stripe",
    method: "POST",
  });
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

function verifyWebhookSignature(body: string, signature: string): Stripe.Event | null {
  const stripe = getStripe();
  const testSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const liveSecret = process.env.STRIPE_LIVE_WEBHOOK_SECRET;

  const secretsToTry = [
    webhookSecret,
    webhookSecret === testSecret ? liveSecret : testSecret,
  ].filter(Boolean) as string[];

  for (const secret of secretsToTry) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret);
    } catch {
      // Try next secret
    }
  }

  console.error("[Webhook] All webhook secrets failed signature verification");
  return null;
}

// ============================================================================
// checkout.session.completed — SINGLE HANDLER FOR ALL CHECKOUT FLOWS
// ============================================================================

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};

  // --- Idempotency: a charter-party checkout writes one payment row per
  // booking against this session; skip only when EVERY row already settled ---
  const existingPayments = await paymentService.getPaymentsByStripeCheckoutSessionId(session.id);
  if (existingPayments.length > 0 && existingPayments.every((p) => p.status === "SUCCEEDED")) {
    console.log(`[Webhook] Session ${session.id} already processed — skipping`);
    return;
  }

  // --- Route by booking type ---
  if (metadata.bookingType === "INSTANT_BOOK") {
    await handleInstantBooking(session, existingPayments[0] ?? null);
  } else {
    // Proposal pay-now or payment-link flows
    await handleBookingPayment(session, existingPayments);
  }
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
    ]);
    const [leadRow] = await db
      .select({ bookingGroupId: bookings.bookingGroupId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (leadRow?.bookingGroupId) {
      const siblings = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.bookingGroupId, leadRow.bookingGroupId));
      for (const s of siblings) bookingIdsToBook.add(s.id);
    }
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
// INVOICE PAID (pay-later invoice flow)
// ============================================================================

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    if (!invoice.id) return;

    const payment = await paymentService.getPaymentByStripeInvoiceId(invoice.id);
    if (!payment) {
      console.warn(`[Webhook] No payment for invoice ${invoice.id}`);
      return;
    }

    // Idempotency
    if (payment.status === "SUCCEEDED") {
      console.log(`[Webhook] Invoice ${invoice.id} already processed`);
      return;
    }

    const paymentIntentId = await getInvoicePaymentIntentId(invoice);
    await paymentService.markPaymentSucceeded(payment.id, paymentIntentId ?? undefined);

    if (payment.payableType !== "BOOKING" || !payment.payableId) return;

    // Get the booking and its group (a charter party has several bookings)
    const [firstBooking] = await db
      .select({
        id: bookings.id,
        bookingGroupId: bookings.bookingGroupId,
      })
      .from(bookings)
      .where(eq(bookings.id, payment.payableId))
      .limit(1);

    if (!firstBooking) return;

    const bookingsToBook = firstBooking.bookingGroupId
      ? await db
          .select({ id: bookings.id, bookingStatus: bookings.bookingStatus })
          .from(bookings)
          .where(eq(bookings.bookingGroupId, firstBooking.bookingGroupId))
      : await db
          .select({ id: bookings.id, bookingStatus: bookings.bookingStatus })
          .from(bookings)
          .where(eq(bookings.id, firstBooking.id));

    for (const b of bookingsToBook) {
      const outcome = await confirmPaidBooking(b.id, "Payment received via invoice");
      const full = await bookingService.getBookingById(b.id);
      if (full) {
        if (outcome === "booked" || outcome === "unchanged") {
          await sendBookingConfirmationEmail(full).catch(() => {});
        }
        await alertTeam({
          subject: `Payment received — ${full.customerName}${full.boatName ? ` · ${full.boatName}` : ""}`,
          heading: "Payment received (invoice)",
          booking: full,
          extraLines: [
            {
              label: "Amount",
              value: formatCentsAsCurrency(invoice.amount_paid, {
                currency: (invoice.currency ?? "usd").toUpperCase(),
              }),
            },
          ],
        });
      }
    }

    console.log(
      `[Webhook] Invoice ${invoice.id} paid — ${bookingsToBook.length} booking(s) booked`
    );
  } catch (error) {
    console.error("[Webhook] handleInvoicePaid error:", error);
    throw error; // Rethrow so Stripe retries
  }
}

// ============================================================================
// CHARGE REFUNDED
// ============================================================================

async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

    if (!paymentIntentId) {
      console.warn("[Webhook] charge.refunded: no payment_intent on charge");
      return;
    }

    // A charter-party checkout settles one payment row per boat, all sharing
    // this intent — refunds must treat them as one unit.
    const paymentRows = await paymentService.getPaymentsByStripeIntentId(paymentIntentId);
    if (paymentRows.length === 0) {
      console.warn(`[Webhook] charge.refunded: no payment for intent ${paymentIntentId}`);
      return;
    }

    if (charge.refunded) {
      // Full refund: every row refunded, every booking in the party cancelled.
      for (const payment of paymentRows) {
        await paymentService.markPaymentRefunded(payment.id);
      }

      const bookingIds = new Set(
        paymentRows.filter((p) => p.payableType === "BOOKING" && p.payableId).map((p) => p.payableId)
      );
      // Expand to group siblings (a no-deposit boat may have had no payment row).
      for (const id of [...bookingIds]) {
        const [row] = await db
          .select({ bookingGroupId: bookings.bookingGroupId })
          .from(bookings)
          .where(eq(bookings.id, id))
          .limit(1);
        if (row?.bookingGroupId) {
          const siblings = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(eq(bookings.bookingGroupId, row.bookingGroupId));
          for (const sib of siblings) bookingIds.add(sib.id);
        }
      }

      const reason = "Full refund processed via Stripe";
      for (const id of bookingIds) {
        const [booking] = await db
          .select({ id: bookings.id, bookingStatus: bookings.bookingStatus })
          .from(bookings)
          .where(eq(bookings.id, id))
          .limit(1);
        if (!booking || booking.bookingStatus === "CANCELLED") continue;

        await db
          .update(bookings)
          .set({
            bookingStatus: "CANCELLED",
            cancellationReason: reason,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, booking.id));
        await db.insert(bookingStatusHistory).values({
          bookingId: booking.id,
          fromStatus: booking.bookingStatus,
          toStatus: "CANCELLED",
          reason,
        });
        await bookingEventsService.logStatusChange({
          bookingId: booking.id,
          fromStatus: booking.bookingStatus as BookingStatus,
          toStatus: "CANCELLED",
          actorType: "system",
          reason,
          channel: "stripe",
        });
      }

      console.log(
        `[Webhook] Full refund: ${paymentRows.length} payment(s) refunded, ${bookingIds.size} booking(s) cancelled`
      );
    } else {
      // Partial refund: Stripe doesn't say which boat it belongs to — record
      // it against the lead payment's booking and leave statuses alone.
      const lead = paymentRows[0];
      await paymentService.createRefund(
        lead.payableType as "BOOKING",
        lead.payableId,
        charge.amount_refunded,
        {
          stripePaymentIntentId: paymentIntentId,
          notes:
            paymentRows.length > 1
              ? "Partial refund synced from Stripe (charter party — recorded on lead booking)"
              : "Partial refund synced from Stripe",
        }
      );
      console.log(
        `[Webhook] Partial refund (${charge.amount_refunded} cents) recorded on payment ${lead.id}`
      );
    }
  } catch (error) {
    console.error("[Webhook] handleChargeRefunded error:", error);
    // Rethrow so Stripe retries — a missed refund leaves the booking state wrong.
    throw error;
  }
}
