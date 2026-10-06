import "server-only";

import { z } from "zod";

import { bookingRequestSchema, type BookingRequest } from "@/features/_validation/validations";
import { addOnService } from "@/features/add-ons/add-on.service";
import { getAppSettings } from "@/features/app-settings/app-settings.service";
import { availabilityService } from "@/features/availability/services/availability.service";
import { boatService } from "@/features/boats/boat.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { bookingService } from "@/features/bookings/services/booking.service";
import { UserFacingError } from "@/shared/lib/errors";
import {
  sendAdminAlertEmail,
  sendInquiryAcknowledgmentEmail,
} from "@/shared/lib/services/email.service";
import { getStripe } from "@/shared/lib/services/stripe.service";
import { assertSignedIn } from "@/shared/lib/utils/auth-utils";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { calculateEndDateTime } from "@/shared/lib/utils/date-helpers";
import { isUuid } from "@/shared/lib/utils/general-utils";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";
import { calculateBookingPriceCents } from "@/shared/lib/utils/pricing-utils";
import {
  boatMemberInquirySchema,
  requestToBookSchema,
  termCharterInquirySchema,
} from "@/shared/lib/validation/inquiry";

/**
 * Booking requests data layer: what customers and the public start from the
 * website — the quote forms (anyone), a boat inquiry and Instant Book
 * checkout (signed in). Every request lands as one `booking` row: an INQUIRY
 * now, or (Instant Book) a BOOKED row once Stripe confirms payment. Prices
 * always come from the boat's own active tiers, never from the browser.
 */

// ============================================================================
// SHARED
// ============================================================================

async function logLeadCreated(bookingId: string) {
  await bookingEventsService.logEvent({
    bookingId,
    eventType: "lead.created",
    actorType: "system",
    actorId: null,
    channel: "web",
    displayMessage: "Inquiry received",
    metadata: null,
  });
}

/**
 * Ping the team inbox about a new lead. Awaited so the serverless runtime
 * can't kill it mid-send; never throws — an alert must never fail the
 * customer's submission.
 */
async function alertTeamNewInquiry(
  bookingId: string,
  input: {
    customer: string;
    email: string;
    phone?: string | null;
    source: string;
    details: { label: string; value: string }[];
  }
) {
  try {
    await sendAdminAlertEmail({
      subject: `New inquiry — ${input.customer} (${input.source})`,
      heading: "New inquiry",
      bookingId,
      lines: [
        { label: "Customer", value: input.customer },
        { label: "Email", value: input.email },
        { label: "Phone", value: input.phone ?? "" },
        { label: "Source", value: input.source },
        ...input.details,
      ],
    });
  } catch (error) {
    console.error("Team alert (new inquiry) failed:", error);
  }
}

/**
 * Parse a single-number budget string ("5000", "$5,000", "$10k") to cents.
 * The first number anchors a range ("$10k–$25k"); pure words ("Flexible")
 * stay null and the label is kept in the message instead.
 */
function parseBudgetCents(budget?: string): number | null {
  if (!budget) return null;
  const match = budget.trim().match(/\$?\s*([\d,]+(?:\.\d+)?)\s*([kK])?/);
  if (!match?.[1]) return null;
  let dollars = Number(match[1].replace(/,/g, ""));
  if (match[2]) dollars *= 1000;
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : null;
}

function parseGuests(guests?: string): number | null {
  if (!guests) return null;
  const n = parseInt(guests, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Keep budget labels that say more than a dollar figure ("Under $10k") visible in the message. */
function messageWithBudgetLabel(
  message: string | null | undefined,
  budget: string | undefined
): string | null {
  const label = budget?.trim();
  const labelNeeded = Boolean(label) && !/^\$?\s*[\d,]+(?:\.\d+)?$/.test(label ?? "");
  const parts = [message?.trim() || null, labelNeeded ? `Budget: ${label}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

// ============================================================================
// QUOTE FORMS (anyone)
// ============================================================================

const generalInquirySchema = requestToBookSchema.extend({
  source: z.enum(["HOME_PAGE", "CONTACT_PAGE"]).default("HOME_PAGE"),
});

export type GeneralInquiryInput = z.input<typeof generalInquirySchema>;

/** The home page / contact page quote form. */
export async function createGeneralInquiry(data: GeneralInquiryInput): Promise<{ bookingId: string }> {
  const validated = generalInquirySchema.parse(data);

  const deal = await bookingService.createInquiry({
    bookingType: "GENERAL_QUOTE",
    source: validated.source,
    customerName: validated.name,
    customerEmail: validated.email,
    customerPhone: validated.phone,
    preferredDate: validated.date || null,
    preferredTimeOfDay: validated.timeOfDay ?? (validated.date ? "FLEXIBLE" : null),
    numberOfPassengers: parseGuests(validated.guests),
    budgetCents: parseBudgetCents(validated.budget),
    customerMessage: messageWithBudgetLabel(validated.message, validated.budget),
    termsAccepted: validated.termsAgreed,
    smsConsent: validated.smsConsent,
  });

  await logLeadCreated(deal.id);
  const details = [
    { label: "Date", value: validated.date || "" },
    { label: "Time", value: validated.timeOfDay || "" },
    { label: "Guests", value: validated.guests || "" },
    { label: "Budget", value: validated.budget || "" },
  ];
  // Branded "we got it" email (Resend). Awaited; failures only log.
  await sendInquiryAcknowledgmentEmail({
    customerName: validated.name,
    customerEmail: validated.email,
    inquiryType: "CHARTER",
    details,
  });
  await alertTeamNewInquiry(deal.id, {
    customer: validated.name,
    email: validated.email,
    phone: validated.phone,
    source: validated.source === "CONTACT_PAGE" ? "Contact page" : "Home page",
    details: [...details, { label: "Message", value: validated.message || "" }],
  });
  return { bookingId: deal.id };
}

export type TermCharterInquiryInput = z.input<typeof termCharterInquirySchema>;

/** Form duration buckets → minimum days (Flexible → null). */
const TERM_DURATION_TO_DAYS: Record<string, number | null> = {
  "3-6 days": 3,
  "1 week": 7,
  "2 weeks": 14,
  "3+ weeks": 21,
  Flexible: null,
};

/** The term charters page request form (multi-day). */
export async function createTermCharterInquiry(
  data: TermCharterInquiryInput
): Promise<{ bookingId: string }> {
  const validated = termCharterInquirySchema.parse(data);
  const message =
    [
      validated.message?.trim() || null,
      validated.accommodations?.trim() ? `Accommodations: ${validated.accommodations.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;

  const deal = await bookingService.createInquiry({
    bookingType: "TERM_CHARTER",
    source: "TERM_CHARTER_PAGE",
    customerName: validated.name,
    customerEmail: validated.email,
    customerPhone: validated.phone,
    preferredDate: validated.startDate || null,
    requestedDurationDays: validated.duration ? (TERM_DURATION_TO_DAYS[validated.duration] ?? null) : null,
    destination: validated.destination || null,
    isMultiDay: true,
    numberOfPassengers: parseGuests(validated.guests),
    budgetCents: parseBudgetCents(validated.budget),
    customerMessage: messageWithBudgetLabel(message, validated.budget),
    termsAccepted: validated.termsAgreed,
  });

  await logLeadCreated(deal.id);
  const details = [
    { label: "Start date", value: validated.startDate || "" },
    { label: "Duration", value: validated.duration || "" },
    { label: "Destination", value: validated.destination || "" },
    { label: "Guests", value: validated.guests || "" },
    { label: "Budget", value: validated.budget || "" },
  ];
  await sendInquiryAcknowledgmentEmail({
    customerName: validated.name,
    customerEmail: validated.email,
    inquiryType: "TERM_CHARTER",
    details,
  });
  await alertTeamNewInquiry(deal.id, {
    customer: validated.name,
    email: validated.email,
    phone: validated.phone,
    source: "Term charter page",
    details: [
      ...details,
      { label: "Accommodations", value: validated.accommodations || "" },
      { label: "Message", value: validated.message || "" },
    ],
  });
  return { bookingId: deal.id };
}

// ============================================================================
// BOAT INQUIRY (signed in)
// ============================================================================

export type BoatInquiryInput = z.input<typeof boatMemberInquirySchema> & { boatId: string };

/** The boat and tier a customer picked, or a clear refusal. */
async function bookableTier(boatId: string, tierId: string) {
  const found = isUuid(boatId) && isUuid(tierId) ? await boatService.getBookableTier(boatId, tierId) : null;
  if (!found) throw new UserFacingError("That boat or duration isn't available to book.", 404);
  return found;
}

/**
 * A request for a specific boat, tier and window (non-instant boats). The row
 * carries the real trip and an estimated value, but stays an INQUIRY — no
 * payment, no calendar hold — until the team prices and proposes it. The
 * boat-page funnel signs guests up first, so name and email always come from
 * the account (never the payload) and the lead links to it.
 */
export async function createBoatInquiry(data: BoatInquiryInput): Promise<{ bookingId: string }> {
  const account = await assertSignedIn("Please sign in to send this inquiry.");
  const validated = boatMemberInquirySchema.parse(data);
  const { boat, tier } = await bookableTier(data.boatId, validated.pricingTierId);

  const phone = account.phoneNumber?.trim() || validated.phone?.trim() || "";
  if (!phone) throw new UserFacingError("Add a phone number so our team can reach you.");
  const contact = {
    name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.email,
    email: account.email,
    phone,
  };

  const startDateTime = new Date(validated.startDateTime);
  const endDateTime = calculateEndDateTime(startDateTime, tier.hours);
  const needsCaptain = validated.needsCaptain || boat.crewRequired || false;
  const { serviceFee } = await getAppSettings();
  const estimate = calculateBookingPriceCents(
    dollarsToCents(tier.price),
    dollarsToCents(boat.cleaningFee || 0),
    0,
    0,
    serviceFee
  );

  const deal = await bookingService.createInquiry({
    bookingType: "BOAT_REQUEST",
    source: "BOAT_PAGE",
    userId: account.id,
    boatId: boat.id,
    boatOwnerId: boat.ownerId,
    pricingTierId: tier.id,
    customerName: contact.name,
    customerEmail: contact.email,
    customerPhone: contact.phone,
    customerMessage: validated.message || null,
    numberOfPassengers: validated.numberOfPassengers,
    startDateTime,
    endDateTime,
    isMultiDay: false,
    needsCaptain,
    estimatedValueCents: estimate.totalPriceCents,
    termsAccepted: validated.termsAgreed,
  });

  await logLeadCreated(deal.id);
  await sendInquiryAcknowledgmentEmail({
    customerName: contact.name,
    customerEmail: contact.email,
    inquiryType: "CHARTER",
    details: [
      { label: "Boat", value: boat.name },
      { label: "Date", value: startDateTime.toLocaleDateString("en-US") },
      { label: "Guests", value: String(validated.numberOfPassengers) },
    ],
  }).catch((err) => console.error("Boat-lead ack email failed:", err));
  await alertTeamNewInquiry(deal.id, {
    customer: contact.name,
    email: contact.email,
    phone: contact.phone,
    source: "Boat page",
    details: [
      { label: "Boat", value: boat.name },
      { label: "Date", value: startDateTime.toLocaleDateString("en-US") },
      { label: "Duration", value: `${tier.hours} hrs` },
      { label: "Guests", value: String(validated.numberOfPassengers) },
      { label: "Captain", value: needsCaptain ? "Needed" : "Not needed" },
      { label: "Message", value: validated.message || "" },
    ],
  });
  return { bookingId: deal.id };
}

// ============================================================================
// INSTANT BOOK (signed in)
// ============================================================================

/**
 * Open a Stripe Checkout session for an Instant Book boat. Nothing is written
 * here: the booking is created when Stripe reports the payment (webhook).
 * Returns the checkout URL.
 */
export async function startInstantCheckout(data: BookingRequest & { boatId: string }): Promise<string> {
  const account = await assertSignedIn("You must be signed in to book");
  const validated = bookingRequestSchema.parse(data);
  const { boat, tier } = await bookableTier(data.boatId, validated.pricingTierId);
  if (!boat.instantBook) throw new UserFacingError("This boat does not support instant booking");

  const startDateTime = new Date(validated.startDateTime);
  const endDateTime = calculateEndDateTime(startDateTime, tier.hours);

  // Never let a customer pay for a slot that's already taken. (The webhook
  // re-checks after payment to narrow the race window.)
  const { isAvailable } = await availabilityService.checkTimeSlotAvailability(
    boat.id,
    startDateTime,
    endDateTime
  );
  if (!isAvailable) {
    throw new UserFacingError("This time slot is no longer available. Please choose a different time.", 409);
  }

  // Add-on prices come from the boat, not the client.
  const { snapshot: addOnSnapshot, addOnsCents } = await addOnService.resolveSelectionForBoat(
    boat.id,
    validated.addOns ?? []
  );
  const { serviceFee } = await getAppSettings();
  const breakdown = calculateBookingPriceCents(
    dollarsToCents(tier.price),
    dollarsToCents(boat.cleaningFee || 0),
    0, // Captain service is included in base price
    addOnsCents,
    serviceFee
  );
  const currency = (boat.currency ?? "USD").toLowerCase();
  const needsCaptain = validated.needsCaptain || boat.crewRequired;

  // The base line carries everything except the add-ons, so add-ons show as
  // their own checkout lines. The lines still sum to the grand total.
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `${boat.name} - ${tier.name || `${tier.hours}hr Charter`}`,
            images: [boat.mainImage || "https://via.placeholder.com/800x600.png?text=Boat+Image"],
            description: `${needsCaptain ? "With Captain" : "Self-Drive"} - ${startDateTime.toLocaleDateString()} at ${startDateTime.toLocaleTimeString()}`,
          },
          unit_amount: breakdown.totalPriceCents - addOnsCents,
        },
        quantity: 1,
      },
      ...addOnSnapshot
        .filter((a) => !a.isComplimentary && a.total > 0)
        .map((a) => ({
          price_data: {
            currency,
            product_data: {
              name: a.quantity > 1 ? `${a.name} × ${a.quantity}` : a.name,
              description: a.description ?? boat.name,
            },
            unit_amount: dollarsToCents(a.total),
          },
          quantity: 1,
        })),
    ],
    metadata: {
      // Everything the webhook needs to create the booking after payment.
      bookingType: "INSTANT_BOOK",
      boatId: boat.id,
      userId: account.id,
      customerName: account.name || "",
      customerEmail: account.email || "",
      customerPhone: account.phoneNumber || "",
      isMultiDay: "false",
      needsCaptain: needsCaptain.toString(),
      startDateTime: validated.startDateTime,
      endDateTime: endDateTime.toISOString(),
      pricingTierId: tier.id,
      numberOfPassengers: validated.numberOfPassengers.toString(),
      // Exact cents + the fee snapshot, so the webhook stores what was paid.
      basePriceCents: String(breakdown.basePriceCents),
      captainFeeCents: String(breakdown.captainFeeCents),
      cleaningFeeCents: String(breakdown.cleaningFeeCents),
      serviceFeeCents: String(breakdown.serviceFeeCents),
      totalAmountCents: String(breakdown.totalPriceCents),
      depositAmountCents: String(dollarsToCents(boat.depositAmount || 0)),
      serviceFeeBps: String(serviceFee.bps),
      serviceFeeFixedCents: String(serviceFee.fixedCents),
      addOns: addOnSnapshot.length > 0 ? JSON.stringify(addOnSnapshot) : "",
      currency: currency.toUpperCase(),
      createdAt: new Date().toISOString(),
    },
    mode: "payment",
    allow_promotion_codes: true,
    success_url: `${getBaseUrl()}/bookings/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getBaseUrl()}/boats/${boat.id}?canceled=true`,
  });

  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}
