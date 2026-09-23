/**
 * Stripe Checkout Session Creation
 *
 * Creates Checkout Sessions for all non-instant booking payments:
 * - Admin request bookings (admin creates booking, sends payment link to customer)
 * - Proposal pay-now (customer accepts the proposal and pays immediately)
 *
 * NOTE: All amounts are stored in CENTS in the database.
 * Stripe also expects amounts in cents, so no conversion is needed.
 */

import { bookingService } from "@/features/bookings/services/booking.service";
import { paymentService } from "@/features/payments/payment.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { getStripe, getOrCreateStripeCustomer } from "@/shared/lib/services/stripe.service";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";
import type { PaymentType } from "@/database/types";

function toAbsoluteImageUrl(url: string | null, baseUrl: string): string | undefined {
  if (!url?.trim()) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = baseUrl.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

/**
 * Create a Stripe Checkout Session for a booking — or its whole charter
 * party. If the booking belongs to a group, the session charges EVERY boat
 * in the party (per-boat line items) and writes one PENDING payment row per
 * booking, all sharing the session id, so per-boat financials stay correct
 * and the webhook/verify can settle and confirm the entire party.
 *
 * Charges the party total unless the payer chose the deposit (chargeType
 * "deposit"), in which case it charges the SUM of per-boat deposits. A
 * deposit exists only if the admin entered one — there is no other switch.
 */
export async function createCheckoutSessionForBooking(
  bookingId: string,
  options?: { chargeType?: "deposit" | "full" }
): Promise<string> {
  const party = await bookingService.getChargeableParty(bookingId);
  if (!party || party.length === 0) throw new Error(`Booking not found: ${bookingId}`);

  const lead = party[0];

  // Checkout is only reachable for priced proposals/requests — an undated
  // INQUIRY row can never be charged.
  if (!lead.booking.startDateTime) {
    throw new Error("This deal has no trip date yet — price and schedule it before charging.");
  }
  for (const member of party) {
    if (member.pricing?.serviceFeeWaived) {
      throw new Error(
        "The card fee on this booking was waived for an off-card payment — collect the balance manually, or un-waive it before charging a card."
      );
    }
    const total = Number(member.pricing?.totalAmountCents ?? 0);
    if (total <= 0) {
      throw new Error(
        `"${member.boat?.name ?? "A boat"}" in this party has no pricing yet — price every boat before charging.`
      );
    }
  }

  const partyTotalCents = party.reduce(
    (sum, m) => sum + Number(m.pricing!.totalAmountCents),
    0
  );
  const partyDepositCents = party.reduce(
    (sum, m) => sum + Number(m.pricing?.depositAmountCents ?? 0),
    0
  );
  const hasDeposit = partyDepositCents > 0;

  const isDeposit = options?.chargeType === "deposit" && hasDeposit;

  const chargeCents = isDeposit ? partyDepositCents : partyTotalCents;
  const paymentRecordType: PaymentType = isDeposit ? "DEPOSIT" : "FULL_PAYMENT";

  const currency = lead.pricing?.currency?.toLowerCase() ?? "usd";
  const baseUrl = getBaseUrl();
  const stripe = getStripe();

  const formatTripDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const passengerCount = lead.booking.numberOfPassengers ?? 1;
  const leadDescriptionParts = [
    `Date: ${formatTripDate(lead.booking.startDateTime)}`,
    `${passengerCount} passenger${passengerCount !== 1 ? "s" : ""}`,
  ];
  if (lead.booking.pickupLocation) {
    leadDescriptionParts.push(`Pickup: ${lead.booking.pickupLocation}`);
  }
  const leadDescription = leadDescriptionParts.join(" • ");

  // Pre-fill the customer email so Stripe doesn't ask for it
  const customerId = await getOrCreateStripeCustomer(
    lead.booking.customerEmail,
    lead.booking.customerName,
    lead.booking.userId ?? undefined
  );

  const lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
      };
      unit_amount: number;
    };
    quantity: number;
  }> = [];

  if (party.length > 1) {
    // ── Charter party: one line item per boat, totals per boat ──
    for (const member of party) {
      const memberName = member.boat?.name ?? "Charter";
      const memberImage = toAbsoluteImageUrl(member.boat?.mainImage ?? null, baseUrl);
      const memberAmount = isDeposit
        ? Number(member.pricing?.depositAmountCents ?? 0)
        : Number(member.pricing!.totalAmountCents);
      if (memberAmount <= 0) continue; // deposit mode: boats without a deposit
      const memberDescription = member.booking.startDateTime
        ? `Date: ${formatTripDate(member.booking.startDateTime)}`
        : undefined;
      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: isDeposit ? `Deposit — ${memberName}` : `Charter: ${memberName}`,
            description: memberDescription,
            images: memberImage ? [memberImage] : undefined,
          },
          unit_amount: memberAmount,
        },
        quantity: 1,
      });
    }
  } else {
    // ── Single boat: detailed breakdown, unchanged from the classic flow ──
    const booking = lead.booking;
    const pricing = lead.pricing!;
    const boatName = lead.boat?.name || "Boat Rental";
    const boatImageUrl = toAbsoluteImageUrl(lead.boat?.mainImage ?? null, baseUrl);

    if (isDeposit) {
      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: `Deposit — ${boatName}`,
            description: leadDescription,
            images: boatImageUrl ? [boatImageUrl] : undefined,
          },
          unit_amount: chargeCents,
        },
        quantity: 1,
      });
    } else {
      const basePriceCents = Number(pricing.basePriceCents ?? 0);
      const cleaningFeeCents = Number(pricing.cleaningFeeCents ?? 0);
      const serviceFeeCents = Number(pricing.serviceFeeCents ?? 0);
      const addOns = (booking.addOns ?? []) as Array<{
        name: string;
        unitPrice: number;
        quantity: number;
        total: number;
      }>;

      if (basePriceCents > 0) {
        lineItems.push({
          price_data: {
            currency,
            product_data: {
              name: `Charter: ${boatName}`,
              description: leadDescription,
              images: boatImageUrl ? [boatImageUrl] : undefined,
            },
            unit_amount: basePriceCents,
          },
          quantity: 1,
        });
      }
      if (cleaningFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency,
            product_data: {
              name: "Cleaning fee",
              description: `${boatName}`,
            },
            unit_amount: cleaningFeeCents,
          },
          quantity: 1,
        });
      }
      for (const addOn of addOns) {
        const addOnCents = dollarsToCents(addOn.total);
        if (addOnCents > 0) {
          lineItems.push({
            price_data: {
              currency,
              product_data: {
                name: addOn.quantity > 1 ? `${addOn.name} × ${addOn.quantity}` : addOn.name,
                description: boatName,
              },
              unit_amount: addOnCents,
            },
            quantity: 1,
          });
        }
      }
      if (serviceFeeCents > 0) {
        // Percent is derived from the booking's own pricing snapshot so the label
        // always matches what was actually charged, even if settings changed since.
        const feeBaseCents =
          basePriceCents + cleaningFeeCents + addOns.reduce((sum, a) => sum + dollarsToCents(a.total), 0);
        const feePercentLabel =
          feeBaseCents > 0
            ? ` (${String(Number(((serviceFeeCents / feeBaseCents) * 100).toFixed(2)))}%)`
            : "";
        lineItems.push({
          price_data: {
            currency,
            product_data: {
              name: `Card processing fee${feePercentLabel}`,
              description: "Applied to subtotal",
            },
            unit_amount: serviceFeeCents,
          },
          quantity: 1,
        });
      }
      if (lineItems.length === 0) {
        lineItems.push({
          price_data: {
            currency,
            product_data: {
              name: `Charter: ${boatName}`,
              description: leadDescription,
              images: boatImageUrl ? [boatImageUrl] : undefined,
            },
            unit_amount: chargeCents,
          },
          quantity: 1,
        });
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: lineItems,
    metadata: {
      bookingId,
      bookingGroupId: lead.booking.bookingGroupId ?? "",
      bookingType: lead.booking.bookingType,
      paymentRecordType,
    },
    success_url: `${baseUrl}/bookings/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/bookings/payment-success?session_id={CHECKOUT_SESSION_ID}&cancelled=true`,
  });

  // One PENDING payment row PER booking (its own share), all sharing the
  // session — per-boat financials stay per-row, settle-all keys off session.
  for (const member of party) {
    const memberAmount = isDeposit
      ? Number(member.pricing?.depositAmountCents ?? 0)
      : Number(member.pricing!.totalAmountCents);
    if (memberAmount <= 0) continue;
    await paymentService.createPayment({
      payableType: "BOOKING",
      payableId: member.booking.id,
      paymentType: paymentRecordType,
      amountCents: memberAmount,
      currency: currency.toUpperCase(),
      status: "PENDING",
      paymentMethodType: "STRIPE_CHECKOUT",
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: customerId,
    });
  }

  return session.url!;
}

/**
 * Get an existing valid checkout session URL for a booking, or create a new
 * one if none exists / the old one expired. Pass `chargeType` when the payer
 * chose deposit-vs-full: an open session for a different amount is expired
 * and replaced, so the customer is never sent to a stale price.
 */
export async function getOrCreateCheckoutUrl(
  bookingId: string,
  options?: { chargeType?: "deposit" | "full" }
): Promise<string> {
  const existingPayments = await paymentService.getPaymentsForPayable("BOOKING", bookingId);

  // Check for an existing PENDING checkout session
  const pendingCheckout = existingPayments.find(
    (p) =>
      p.paymentMethodType === "STRIPE_CHECKOUT" &&
      p.status === "PENDING" &&
      p.stripeCheckoutSessionId
  );

  if (pendingCheckout?.stripeCheckoutSessionId) {
    const stripe = getStripe();
    let reusable = false;
    try {
      const session = await stripe.checkout.sessions.retrieve(
        pendingCheckout.stripeCheckoutSessionId
      );
      if (session.status === "open" && session.url) {
        // A deposit session can't serve a full-payment request (or vice
        // versa): the pending row's type says what the session charges.
        const sessionIsDeposit = pendingCheckout.paymentType === "DEPOSIT";
        const wantsDeposit = options?.chargeType === "deposit";
        reusable = options?.chargeType === undefined || sessionIsDeposit === wantsDeposit;
        if (reusable) return session.url;
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch {
          // Already expired/completed — the row below is cancelled either way.
        }
      }
    } catch {
      // Session expired or invalid — fall through to create a new one
    }

    // Mark this booking's pending rows on that session as CANCELLED. Checkout
    // is always started from the lead booking, so its rows are the ones that
    // gate reuse; sibling rows are settled or cancelled by session id downstream.
    for (const p of existingPayments) {
      if (
        p.status === "PENDING" &&
        p.stripeCheckoutSessionId === pendingCheckout.stripeCheckoutSessionId
      ) {
        await paymentService.updatePayment(p.id, { status: "CANCELLED" });
      }
    }
  }

  // Also check for legacy Payment Link payments
  const pendingLink = existingPayments.find(
    (p) => p.paymentMethodType === "STRIPE_LINK" && p.status === "PENDING" && p.stripePaymentLinkId
  );

  if (pendingLink?.stripePaymentLinkId) {
    try {
      const stripe = getStripe();
      const paymentLink = await stripe.paymentLinks.retrieve(pendingLink.stripePaymentLinkId);
      if (paymentLink.active && paymentLink.url) {
        return paymentLink.url;
      }
    } catch {
      // Payment link invalid — fall through
    }
  }

  return createCheckoutSessionForBooking(bookingId, {
    chargeType: options?.chargeType,
  });
}
