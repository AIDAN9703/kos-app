"use server";

/**
 * Lead intake — every public form and admin-logged lead lands here and
 * becomes a `booking` row at status INQUIRY (docs/UNIFIED_BOOKINGS_PLAN.md).
 * No boat/dates/pricing required yet; the row progresses through the one
 * deal lifecycle from there.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/database/db";
import { bookings, boats, boatPricingTiers, users } from "@/database/schema";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import {
  boatMemberInquirySchema,
  requestToBookSchema,
  termCharterInquirySchema,
} from "@/shared/lib/validation/inquiry";
import {
  sendAdminAlertEmail,
  sendInquiryAcknowledgmentEmail,
} from "@/shared/lib/services/email.service";
import { calculateEndDateTime } from "@/shared/lib/utils/date-helpers";
import { calculateBookingPriceCents } from "@/shared/lib/utils/pricing-utils";
import { dollarsToCents } from "@/shared/lib/utils/money-utils";
import { getAppSettings } from "@/features/app-settings/app-settings.service";
import { getSession } from "@/shared/lib/utils/auth-utils";
import { revalidateDeal } from "@/features/bookings/lib/deal-access";

/** Event type for all intake events — matches the backfill's `lead.created`. */
const LEAD_CREATED_EVENT = "lead.created";

async function logLeadCreated(
  bookingId: string,
  actorId: string | null,
  metadata?: Record<string, unknown>
) {
  await bookingEventsService.logEvent({
    bookingId,
    eventType: LEAD_CREATED_EVENT,
    actorType: actorId ? "admin" : "system",
    actorId,
    channel: actorId ? "admin_portal" : "web",
    displayMessage: "Inquiry received",
    metadata: metadata ?? null,
  });
}

/**
 * Ping the team inbox about a new lead (replaces the old GoHighLevel admin
 * notification). Awaited so the serverless runtime can't kill it mid-send;
 * never throws — an alert must never fail the customer's submission.
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
 * Parse a single-number budget string ("5000", "$5,000") to cents.
 * Range labels ("$10,000-$25,000", "Flexible") return null — the label is
 * appended to the customer message instead so nothing is lost.
 */
function parseBudgetCents(budget?: string): number | null {
  if (!budget) return null;
  // Accepts "$12,000", "12000", "$10k", and range labels like "$10k–$25k"
  // (first number wins as the anchor). Pure words ("Flexible") stay null.
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

/** Keep unparseable budget labels ("$10k–$25k", "Flexible") visible in the message. */
function messageWithBudgetLabel(
  message: string | null | undefined,
  budget: string | undefined
): string | null {
  const label = budget?.trim();
  // Keep the label whenever it says more than a plain dollar figure —
  // "Under $10k" parses to an anchor amount but the nuance lives in the text.
  const labelNeeded = Boolean(label) && !/^\$?\s*[\d,]+(?:\.\d+)?$/.test(label ?? "");
  const parts = [message?.trim() || null, labelNeeded ? `Budget: ${label}` : null].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join("\n\n") : null;
}

// ============================================================================
// General quote (home page / contact page)
// ============================================================================

/** The public quote form's own schema plus the page it came from. */
const generalLeadSchema = requestToBookSchema.extend({
  source: z.enum(["HOME_PAGE", "CONTACT_PAGE"]).default("HOME_PAGE"),
});

export type GeneralLeadInput = z.input<typeof generalLeadSchema>;

export async function createGeneralLead(data: GeneralLeadInput) {
  try {
    const validated = generalLeadSchema.parse(data);

    const [deal] = await db
      .insert(bookings)
      .values({
        bookingType: "GENERAL_QUOTE",
        bookingStatus: "INQUIRY",
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
      })
      .returning({ id: bookings.id });

    if (deal) {
      await logLeadCreated(deal.id, null);
      // Branded "we got it" email — ours (Resend). Awaited so the
      // serverless runtime can't kill it mid-send; failures only log.
      await sendInquiryAcknowledgmentEmail({
        customerName: validated.name,
        customerEmail: validated.email,
        inquiryType: "CHARTER",
        details: [
          { label: "Date", value: validated.date || "" },
          { label: "Time", value: validated.timeOfDay || "" },
          { label: "Guests", value: validated.guests || "" },
          { label: "Budget", value: validated.budget || "" },
        ],
      });
      await alertTeamNewInquiry(deal.id, {
        customer: validated.name,
        email: validated.email,
        phone: validated.phone,
        source: validated.source === "CONTACT_PAGE" ? "Contact page" : "Home page",
        details: [
          { label: "Date", value: validated.date || "" },
          { label: "Time", value: validated.timeOfDay || "" },
          { label: "Guests", value: validated.guests || "" },
          { label: "Budget", value: validated.budget || "" },
          { label: "Message", value: validated.message || "" },
        ],
      });
    }
    revalidateDeal();

    return {
      success: true,
      bookingId: deal?.id ?? null,
      message: "Your inquiry has been submitted successfully. Our team will contact you shortly.",
    };
  } catch (error) {
    console.error("Error creating general lead:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid inquiry data",
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    return { success: false, error: "Failed to submit your inquiry. Please try again." };
  }
}

// ============================================================================
// Term charter (multi-day landing page)
// ============================================================================

export type TermCharterLeadInput = z.input<typeof termCharterInquirySchema>;

/** Form duration buckets → minimum days (Flexible → null). */
const TERM_DURATION_TO_DAYS: Record<string, number | null> = {
  "3-6 days": 3,
  "1 week": 7,
  "2 weeks": 14,
  "3+ weeks": 21,
  Flexible: null,
};

export async function createTermCharterLead(data: TermCharterLeadInput) {
  try {
    const validated = termCharterInquirySchema.parse(data);

    const message =
      [
        validated.message?.trim() || null,
        validated.accommodations?.trim()
          ? `Accommodations: ${validated.accommodations.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n") || null;

    const [deal] = await db
      .insert(bookings)
      .values({
        bookingType: "TERM_CHARTER",
        bookingStatus: "INQUIRY",
        source: "TERM_CHARTER_PAGE",
        customerName: validated.name,
        customerEmail: validated.email,
        customerPhone: validated.phone,
        preferredDate: validated.startDate || null,
        requestedDurationDays: validated.duration
          ? (TERM_DURATION_TO_DAYS[validated.duration] ?? null)
          : null,
        destination: validated.destination || null,
        isMultiDay: true,
        numberOfPassengers: parseGuests(validated.guests),
        budgetCents: parseBudgetCents(validated.budget),
        customerMessage: messageWithBudgetLabel(message, validated.budget),
        termsAccepted: validated.termsAgreed,
      })
      .returning({ id: bookings.id });

    if (deal) {
      await logLeadCreated(deal.id, null);
      // Branded "we got it" email — ours (Resend). Awaited so the
      // serverless runtime can't kill it mid-send; failures only log.
      await sendInquiryAcknowledgmentEmail({
        customerName: validated.name,
        customerEmail: validated.email,
        inquiryType: "TERM_CHARTER",
        details: [
          { label: "Start date", value: validated.startDate || "" },
          { label: "Duration", value: validated.duration || "" },
          { label: "Destination", value: validated.destination || "" },
          { label: "Guests", value: validated.guests || "" },
          { label: "Budget", value: validated.budget || "" },
        ],
      });
      await alertTeamNewInquiry(deal.id, {
        customer: validated.name,
        email: validated.email,
        phone: validated.phone,
        source: "Term charter page",
        details: [
          { label: "Start date", value: validated.startDate || "" },
          { label: "Duration", value: validated.duration || "" },
          { label: "Destination", value: validated.destination || "" },
          { label: "Guests", value: validated.guests || "" },
          { label: "Budget", value: validated.budget || "" },
          { label: "Accommodations", value: validated.accommodations || "" },
          { label: "Message", value: validated.message || "" },
        ],
      });
    }
    revalidateDeal();

    return {
      success: true,
      bookingId: deal?.id ?? null,
      message:
        "Your term charter request has been submitted. Our specialists will contact you shortly.",
    };
  } catch (error) {
    console.error("Error creating term charter lead:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid inquiry data",
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    return { success: false, error: "Failed to submit your inquiry. Please try again." };
  }
}

// ============================================================================
// Boat inquiry (public boat page, non-instant boats)
// ============================================================================

export type BoatLeadInput = (
  | z.input<typeof boatMemberInquirySchema>
) & { boatId: string };

/**
 * Boat-specific lead: the customer already chose a boat, tier, and exact
 * window, so the row carries real trip fields + an estimated value — but it
 * is still an INQUIRY (no payment, no calendar block) until an admin prices
 * and proposes it.
 */
export async function createBoatLead(data: BoatLeadInput) {
  try {
    // The boat-page funnel signs guests up in place (BookingAuthSection
    // modal), so by the time this action runs there is always an account —
    // name/email come from it (never the payload) and the lead links to it.
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Please sign in to send this inquiry." };
    }

    const validated = boatMemberInquirySchema.parse(data);
    const [account] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (!account) {
      return { success: false, error: "We couldn't load your account. Please sign in again." };
    }
    const phone = account.phoneNumber?.trim() || validated.phone?.trim() || "";
    if (!phone) {
      return { success: false, error: "Add a phone number so our team can reach you." };
    }
    const contact = {
      name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.email,
      email: account.email,
      phone,
    };
    const userId = session.user.id;

    const { boatId } = data;

    const [boat] = await db
      .select({
        id: boats.id,
        name: boats.name,
        ownerId: boats.ownerId,
        cleaningFee: boats.cleaningFee,
        crewRequired: boats.crewRequired,
      })
      .from(boats)
      .where(eq(boats.id, boatId));

    if (!boat) {
      return { success: false, error: "Boat not found" };
    }

    const [pricingTier] = await db
      .select()
      .from(boatPricingTiers)
      .where(
        and(eq(boatPricingTiers.id, validated.pricingTierId), eq(boatPricingTiers.boatId, boatId))
      );

    if (!pricingTier) {
      return { success: false, error: "Invalid pricing tier selected" };
    }

    const startDateTime = new Date(validated.startDateTime);
    const endDateTime = calculateEndDateTime(startDateTime, pricingTier.hours);
    const needsCaptain = validated.needsCaptain || boat.crewRequired || false;

    const { serviceFee } = await getAppSettings();
    const priceBreakdown = calculateBookingPriceCents(
      dollarsToCents(pricingTier.price),
      dollarsToCents(boat.cleaningFee || 0),
      0,
      0,
      serviceFee
    );

    const [deal] = await db
      .insert(bookings)
      .values({
        bookingType: "BOAT_REQUEST",
        bookingStatus: "INQUIRY",
        source: "BOAT_PAGE",
        userId,
        boatId,
        boatOwnerId: boat.ownerId,
        pricingTierId: validated.pricingTierId,
        customerName: contact.name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        customerMessage: validated.message || null,
        numberOfPassengers: validated.numberOfPassengers,
        startDateTime,
        endDateTime,
        isMultiDay: false,
        needsCaptain,
        estimatedValueCents: priceBreakdown.totalPriceCents,
        termsAccepted: validated.termsAgreed,
      })
      .returning({ id: bookings.id });

    if (deal) {
      await logLeadCreated(deal.id, null);
      // Branded "we got it" email — same one the other intake flows send.
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
          { label: "Duration", value: `${pricingTier.hours} hrs` },
          { label: "Guests", value: String(validated.numberOfPassengers) },
          { label: "Captain", value: needsCaptain ? "Needed" : "Not needed" },
          { label: "Message", value: validated.message || "" },
        ],
      });
    }
    revalidateDeal();
    revalidatePath(`/boats/${boatId}`);

    return {
      success: true,
      bookingId: deal?.id ?? null,
      message:
        "Your request has been submitted. Our team will review availability and contact you shortly.",
    };
  } catch (error) {
    console.error("Error creating boat lead:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    return { success: false, error: "Failed to submit your request. Please try again." };
  }
}

// (Manual "log lead" intake removed 2026-07-21 — the admin's one door is the
// Add booking flow; inquiries only arrive from customer-facing forms above.)
