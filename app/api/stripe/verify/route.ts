import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/db";
import { bookings, bookingStatusHistory, bookingPricing, payments, boats } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { paymentService } from "@/features/payments/payment.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { sendBookingConfirmationEmail } from "@/shared/lib/services/email.service";
import { alertTeam } from "@/features/bookings/lib/team-alerts";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import type { BookingStatus } from "@/database/types";
import { getStripe } from "@/shared/lib/services/stripe.service";
import { fulfillInstantCheckoutSession } from "@/features/bookings/services/instant-checkout-fulfillment.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/verify?session_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return NextResponse.json({ success: false, error: "Invalid session_id" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.status !== "complete" || session.payment_status === "unpaid") {
      return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 400 });
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

      if (!bookingId) {
        return NextResponse.json(
          {
            success: true,
            message: "Payment successful — booking is still processing.",
          },
          { status: 202 }
        );
      }
    }

    return buildVerifyResponse(bookingId, paymentIntentId, sessionId);
  } catch (error) {
    console.error("Error verifying Stripe payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}

async function buildVerifyResponse(
  bookingId: string,
  paymentIntentId?: string | null,
  sessionId?: string | null
) {
  const [booking] = await db
    .select({
      id: bookings.id,
      bookingStatus: bookings.bookingStatus,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return NextResponse.json(
      { success: true, message: "Booking is still processing." },
      { status: 202 }
    );
  }

  // Confirm the booking AND its charter-party siblings — a group checkout
  // sells every boat in the party, and the webhook may never reach us.
  const [leadRow] = await db
    .select({ bookingGroupId: bookings.bookingGroupId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  const partyIds = new Set<string>([bookingId]);
  if (leadRow?.bookingGroupId) {
    const siblings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.bookingGroupId, leadRow.bookingGroupId));
    for (const sib of siblings) partyIds.add(sib.id);
  }

  for (const id of partyIds) {
    const [row] = await db
      .select({ id: bookings.id, bookingStatus: bookings.bookingStatus })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!row || row.bookingStatus === "BOOKED") continue;

    await db
      .update(bookings)
      .set({ bookingStatus: "BOOKED", updatedAt: new Date() })
      .where(eq(bookings.id, id));

    await db.insert(bookingStatusHistory).values({
      bookingId: id,
      fromStatus: row.bookingStatus as BookingStatus,
      toStatus: "BOOKED",
      reason: "Payment verified",
    });
    await bookingEventsService.logStatusChange({
      bookingId: id,
      fromStatus: row.bookingStatus as BookingStatus,
      toStatus: "BOOKED",
      actorType: "system",
      reason: "Payment verified",
      channel: "stripe",
    });
  }

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
      await sendBookingConfirmationEmail(fullBooking).catch((e) =>
        console.warn("[Verify] Confirmation email failed:", e)
      );
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

  // What the guest actually paid — today's session and everything so far —
  // so the thank-you page never presents the booking total as "paid".
  const succeeded = (await paymentService.getBookingPayments(bookingId)).filter(
    (p) => p.status === "SUCCEEDED" && p.paymentType !== "REFUND"
  );
  const totalPaidCents = succeeded.reduce((sum, p) => sum + Number(p.amountCents), 0);
  const paidNowCents = sessionId
    ? succeeded
        .filter((p) => p.stripeCheckoutSessionId === sessionId)
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

  return NextResponse.json({
    success: true,
    bookingId,
    status: "BOOKED",
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
  });
}
