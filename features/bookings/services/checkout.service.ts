import "server-only";

/**
 * Stripe Checkout for every non-instant card payment: the public proposal
 * page, the customer's trip page, and the payment links admins send.
 *
 * What gets charged comes from planCharge (features/bookings/lib/charge-plan):
 * a deposit plus its share of the card fee, the full total, or the remaining
 * balance. Amounts are cents end to end, matching Stripe.
 */

import { bookingService } from "@/features/bookings/services/booking.service";
import { paymentService } from "@/features/payments/payment.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { getStripe, getOrCreateStripeCustomer } from "@/shared/lib/services/stripe.service";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";
import { formatServiceFee, serviceFeeFromSnapshot } from "@/shared/lib/utils/pricing-utils";
import {
  planCharge,
  type ChargeableBoat,
  type ChargePlan,
  type ChargeType,
} from "@/features/bookings/lib/charge-plan";

type Party = NonNullable<Awaited<ReturnType<typeof bookingService.getChargeableParty>>>;

type LineItem = {
  price_data: {
    currency: string;
    product_data: { name: string; description?: string; images?: string[] };
    unit_amount: number;
  };
  quantity: number;
};

function toAbsoluteImageUrl(url: string | null, baseUrl: string): string | undefined {
  if (!url?.trim()) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

const formatTripDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/** The party plus what each boat has already been paid, ready to plan. */
async function loadParty(bookingId: string): Promise<{ party: Party; boats: ChargeableBoat[] }> {
  const party = await bookingService.getChargeableParty(bookingId);
  if (!party || party.length === 0) throw new Error(`Booking not found: ${bookingId}`);

  // Only a priced, dated deal can be charged — an INQUIRY row never is.
  if (!party[0].booking.startDateTime) {
    throw new Error("This deal has no trip date yet — price and schedule it before charging.");
  }
  for (const member of party) {
    if (Number(member.pricing?.totalAmountCents ?? 0) <= 0) {
      throw new Error(
        `"${member.boat?.name ?? "A boat"}" in this party has no pricing yet — price every boat before charging.`
      );
    }
  }

  const paid = await paymentService.getPaidCentsByBooking(party.map((m) => m.booking.id));
  const boats: ChargeableBoat[] = party.map((m) => ({
    bookingId: m.booking.id,
    totalCents: Number(m.pricing!.totalAmountCents),
    serviceFeeCents: Number(m.pricing!.serviceFeeCents ?? 0),
    serviceFee: serviceFeeFromSnapshot(m.pricing!),
    serviceFeeWaived: Boolean(m.pricing!.serviceFeeWaived),
    depositCents:
      m.pricing!.depositAmountCents != null ? Number(m.pricing!.depositAmountCents) : null,
    paidCents: paid.get(m.booking.id) ?? 0,
  }));
  return { party, boats };
}

function planOrThrow(boats: ChargeableBoat[], chargeType: ChargeType): ChargePlan {
  const result = planCharge(boats, chargeType);
  if (!result.ok) throw new Error(result.error);
  return result.plan;
}

/**
 * Stripe line items for a plan. Every list sums to exactly plan.amountCents;
 * the itemized single-boat breakdown falls back to one line if its parts
 * ever disagree with the stored total.
 */
function buildLineItems(
  party: Party,
  boats: ChargeableBoat[],
  plan: ChargePlan,
  currency: string
): LineItem[] {
  const baseUrl = getBaseUrl();
  const memberById = new Map(party.map((m) => [m.booking.id, m]));
  const line = (name: string, amount: number, description?: string, image?: string): LineItem => ({
    price_data: {
      currency,
      product_data: { name, description, images: image ? [image] : undefined },
      unit_amount: amount,
    },
    quantity: 1,
  });
  const lead = party[0];
  const passengers = lead.booking.numberOfPassengers ?? 1;
  const tripDescription = [
    `Date: ${formatTripDate(lead.booking.startDateTime!)}`,
    `${passengers} passenger${passengers !== 1 ? "s" : ""}`,
    lead.booking.pickupLocation ? `Pickup: ${lead.booking.pickupLocation}` : null,
  ]
    .filter(Boolean)
    .join(" • ");
  const feeLabel = (bookingId: string) => {
    const boat = boats.find((b) => b.bookingId === bookingId);
    return boat ? ` (${formatServiceFee(boat.serviceFee)})` : "";
  };

  if (plan.kind === "DEPOSIT") {
    const items = plan.lines.map((l) => {
      const m = memberById.get(l.bookingId)!;
      return line(
        `Deposit — ${m.boat?.name ?? "Charter"}`,
        l.baseCents,
        party.length > 1 && m.booking.startDateTime
          ? `Date: ${formatTripDate(m.booking.startDateTime)}`
          : tripDescription,
        toAbsoluteImageUrl(m.boat?.mainImage ?? null, baseUrl)
      );
    });
    if (plan.feeCents > 0) {
      items.push(
        line(
          `Card processing fee${feeLabel(plan.lines[0].bookingId)}`,
          plan.feeCents,
          "Applied to the deposit"
        )
      );
    }
    return items;
  }

  if (plan.kind === "PARTIAL") {
    return plan.lines.map((l) => {
      const m = memberById.get(l.bookingId)!;
      return line(
        `Remaining balance — ${m.boat?.name ?? "Charter"}`,
        l.amountCents,
        "Includes the card processing fee on the balance",
        toAbsoluteImageUrl(m.boat?.mainImage ?? null, baseUrl)
      );
    });
  }

  // FULL_PAYMENT
  if (party.length > 1) {
    return plan.lines.map((l) => {
      const m = memberById.get(l.bookingId)!;
      return line(
        `Charter: ${m.boat?.name ?? "Charter"}`,
        l.amountCents,
        m.booking.startDateTime
          ? `Date: ${formatTripDate(m.booking.startDateTime)} • Includes the card processing fee`
          : "Includes the card processing fee",
        toAbsoluteImageUrl(m.boat?.mainImage ?? null, baseUrl)
      );
    });
  }

  const pricing = lead.pricing!;
  const boatName = lead.boat?.name || "Boat Rental";
  const image = toAbsoluteImageUrl(lead.boat?.mainImage ?? null, baseUrl);
  const addOns = (lead.booking.addOns ?? []) as Array<{
    name: string;
    quantity: number;
    total: number;
  }>;
  const items: LineItem[] = [];
  const base = Number(pricing.basePriceCents ?? 0);
  if (base > 0) items.push(line(`Charter: ${boatName}`, base, tripDescription, image));
  const captain = Number(pricing.captainFeeCents ?? 0);
  if (captain > 0) items.push(line("Captain", captain, boatName));
  const cleaning = Number(pricing.cleaningFeeCents ?? 0);
  if (cleaning > 0) items.push(line("Cleaning fee", cleaning, boatName));
  for (const addOn of addOns) {
    const cents = dollarsToCents(addOn.total);
    if (cents > 0) {
      items.push(
        line(addOn.quantity > 1 ? `${addOn.name} × ${addOn.quantity}` : addOn.name, cents, boatName)
      );
    }
  }
  if (plan.feeCents > 0) {
    items.push(
      line(
        `Card processing fee${feeLabel(lead.booking.id)}`,
        plan.feeCents,
        "Applied to the subtotal"
      )
    );
  }
  const itemized = items.reduce((sum, i) => sum + i.price_data.unit_amount, 0);
  return itemized === plan.amountCents
    ? items
    : [
        line(
          `Charter: ${boatName}`,
          plan.amountCents,
          `${tripDescription} • Includes the card processing fee`,
          image
        ),
      ];
}

/**
 * Create a Checkout Session for a booking or its whole charter party, and
 * one PENDING payment row per boat (its own share) sharing the session id,
 * so per-boat financials stay correct and the webhook settles them together.
 */
async function createSession(
  bookingId: string,
  party: Party,
  boats: ChargeableBoat[],
  plan: ChargePlan
): Promise<string> {
  const lead = party[0];
  const currency = lead.pricing?.currency?.toLowerCase() ?? "usd";
  const baseUrl = getBaseUrl();

  const customerId = await getOrCreateStripeCustomer(
    lead.booking.customerEmail,
    lead.booking.customerName,
    lead.booking.userId ?? undefined
  );

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: buildLineItems(party, boats, plan, currency),
    metadata: {
      bookingId,
      bookingGroupId: lead.booking.bookingGroupId ?? "",
      bookingType: lead.booking.bookingType,
      paymentRecordType: plan.kind,
    },
    // Copied to the payment, so refunds and disputes in the Stripe Dashboard
    // say which booking they belong to.
    payment_intent_data: {
      description: `${lead.boat?.name ?? "Charter"} · ${lead.booking.customerName}${party.length > 1 ? ` (+${party.length - 1} boats)` : ""}`,
      metadata: { bookingId, bookingGroupId: lead.booking.bookingGroupId ?? "", paymentRecordType: plan.kind },
    },
    success_url: `${baseUrl}/bookings/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/bookings/payment-success?session_id={CHECKOUT_SESSION_ID}&cancelled=true`,
  });

  for (const l of plan.lines) {
    await paymentService.createPayment({
      payableType: "BOOKING",
      payableId: l.bookingId,
      paymentType: plan.kind,
      amountCents: l.amountCents,
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
 * Reuse the booking's open checkout session when it charges exactly what this
 * request would (same kind, same amount); otherwise expire it and open a new
 * one, so nobody is ever sent to a stale price.
 */
export async function getOrCreateCheckoutUrl(
  bookingId: string,
  options?: { chargeType?: ChargeType }
): Promise<string> {
  const { party, boats } = await loadParty(bookingId);
  const plan = planOrThrow(boats, options?.chargeType ?? "full");
  const leadLine = plan.lines.find((l) => l.bookingId === bookingId) ?? plan.lines[0];

  const existing = await paymentService.getPaymentsForPayable("BOOKING", leadLine.bookingId);
  const pending = existing.find(
    (p) =>
      p.paymentMethodType === "STRIPE_CHECKOUT" &&
      p.status === "PENDING" &&
      p.stripeCheckoutSessionId
  );

  if (pending?.stripeCheckoutSessionId) {
    const stripe = getStripe();
    try {
      const session = await stripe.checkout.sessions.retrieve(pending.stripeCheckoutSessionId);
      if (session.status === "open" && session.url) {
        const sameCharge =
          pending.paymentType === plan.kind &&
          Number(pending.amountCents) === leadLine.amountCents &&
          session.amount_total === plan.amountCents;
        if (sameCharge) return session.url;
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch {
          // Already expired or completed — the rows below are cancelled either way.
        }
      }
    } catch {
      // Session missing or invalid — fall through and open a new one.
    }

    // Cancel every pending row on that session, across the whole party.
    const sessionRows = await paymentService.getPaymentsByStripeCheckoutSessionId(
      pending.stripeCheckoutSessionId
    );
    for (const row of sessionRows) {
      if (row.status === "PENDING")
        await paymentService.updatePayment(row.id, { status: "CANCELLED" });
    }
  }

  return createSession(bookingId, party, boats, plan);
}
