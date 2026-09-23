"use server";

import { ZodError } from "zod";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";
import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingExpenseLineService } from "@/features/bookings/services/booking-expense-line.service";
import { bookingOpsService } from "@/features/bookings/services/booking-ops.service";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import {
  createBookingFullSchema,
  type CreateBookingFullInput,
} from "@/features/bookings/booking.validation";
import { sendProposalEmail as emailProposalToCustomer } from "@/shared/lib/services/email.service";
import { sendSms } from "@/shared/lib/services/twilio.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import type { ActionResponse } from "@/shared/lib/types/types";
import { db } from "@/database/db";
import { boats, bookingPricing } from "@/database/schema";
import { eq, inArray } from "drizzle-orm";

/** Boat name for the proposal email's yacht card — best-effort, never blocks the send. */
async function getBoatName(boatId: string | undefined | null): Promise<string | undefined> {
  if (!boatId) return undefined;
  try {
    const [row] = await db
      .select({ name: boats.name })
      .from(boats)
      .where(eq(boats.id, boatId))
      .limit(1);
    return row?.name ?? undefined;
  } catch {
    return undefined;
  }
}

function formatZodError(error: ZodError): string {
  const first = error.errors[0];
  if (!first) return "Validation failed";
  const path = first.path.filter(Boolean).join(".");
  return path ? `${path}: ${first.message}` : first.message;
}

type CreateBookingFullResult = {
  bookingId: string;
  publicToken: string | null;
  groupId: string | null;
  /** True when the admin asked to send by at least one channel. */
  proposalSent: boolean;
  /** Per-channel outcome: null = not requested, false = requested but failed. */
  emailSent: boolean | null;
  smsSent: boolean | null;
};

/**
 * THE booking-creation action — every door (create page, deal-page proposal
 * modal, dashboard/header modal) submits here via BookingComposer.
 *
 * Wraps the booking pipeline (createBookings → pricing → status history →
 * booking.created event): one section = a single booking, multiple sections =
 * a charter party (group container + one row per boat, one proposal link, one
 * payment for the lot). Also persists the financial/ops data captured up
 * front (owner payout + expense lines, GMV / source / sales agent) against
 * the lead booking, and optionally emails/texts the proposal on create.
 */
export async function createBookingFull(
  rawInput: CreateBookingFullInput
): Promise<ActionResponse<CreateBookingFullResult>> {
  try {
    const adminAuth = await getAdminSession();
    if (adminAuth.error !== undefined) {
      return { success: false, error: adminAuth.error };
    }
    const adminId = adminAuth.session.user.id;

    const input = createBookingFullSchema.parse(rawInput);

    const sendProposalEmail = input.sendProposalEmail ?? false;
    const sendProposalSms = input.sendProposalSms ?? false;
    const publishNow = sendProposalEmail || sendProposalSms;

    // 1. Core booking(s). One section = classic single booking; multiple
    //    sections = a charter party (group container + one row per boat).
    //    Reuses all existing pricing + status-history + audit behavior.
    const isParty = input.bookings.length > 1;
    const result = await bookingService.createBookings(
      {
        dealId: input.dealId ?? null,
        numberOfPassengers: input.numberOfPassengers,
        pickupLocation: input.pickupLocation ?? null,
        dropoffLocation: input.dropoffLocation ?? null,
        adminNotes: input.adminNotes ?? null,
        bookings: input.bookings,
        groupName: isParty
          ? `${input.bookings[0].customerName}'s charter party`
          : null,
        allowPayment: input.allowPayment ?? false,
        sendProposalEmail,
        sendProposalSms,
        publishNow,
      },
      adminId
    );

    const bookingId = result.bookingIds[0];
    if (!bookingId) {
      return { success: false, error: "Booking was not created" };
    }

    // 2-4. Per-boat financials. Every boat in a charter party has its own
    //      owner, own costs, and own share of the gross — pooling them onto
    //      the lead row double-counts GMV on the board and leaves siblings
    //      blank. GMV is DERIVED from each boat's own pricing (charter gross
    //      = total − card processing fee), never taken from the client.
    const pricingRows = await db
      .select({
        bookingId: bookingPricing.bookingId,
        totalAmountCents: bookingPricing.totalAmountCents,
        serviceFeeCents: bookingPricing.serviceFeeCents,
      })
      .from(bookingPricing)
      .where(inArray(bookingPricing.bookingId, result.bookingIds));
    const pricingByBooking = new Map(pricingRows.map((r) => [r.bookingId, r]));

    const sourceOverride = input.source?.trim() || null;
    const agentCode = input.agentCode?.trim() || null;
    let partyGmvCents = 0;
    let partyOwnerPayoutCents = 0;

    for (const [index, id] of result.bookingIds.entries()) {
      const section = input.bookings[index];
      const lines = section?.expenseLines ?? [];

      // Expense lines first: saveLines aggregates every line (owner payout
      // + other costs) into booking_ops.expense_cents, which the ops upsert
      // below folds into revenue.
      if (lines.length > 0) {
        await bookingExpenseLineService.saveLines(
          id,
          lines.map((line, i) => ({
            category: line.category,
            amountCents: line.amountCents,
            label: line.label ?? null,
            sortOrder: line.sortOrder ?? i,
            source: line.source ?? "MANUAL",
          }))
        );
        partyOwnerPayoutCents += lines
          .filter((l) => l.category === "OWNER_PAYOUT")
          .reduce((sum, l) => sum + l.amountCents, 0);
      }

      const pricing = pricingByBooking.get(id);
      const gmvCents =
        pricing != null
          ? Number(pricing.totalAmountCents) - Number(pricing.serviceFeeCents ?? 0)
          : null;
      if (gmvCents != null) partyGmvCents += gmvCents;

      if (gmvCents != null || sourceOverride || agentCode) {
        await bookingOpsService.upsert(id, {
          gmvCents,
          sourceOverride,
          agentCode,
        });
      }
    }

    // Audit the financials capture once, on the lead (creation itself is
    // already logged as booking.created via createInitialHistory).
    const totalExpenseLines = input.bookings.reduce(
      (sum, b) => sum + (b.expenseLines?.length ?? 0),
      0
    );
    if (totalExpenseLines > 0 || sourceOverride || agentCode) {
      await bookingEventsService.logEvent({
        bookingId,
        eventType: BOOKING_EVENT_TYPES.UPDATED,
        actorType: "admin",
        actorId: adminId,
        channel: "admin_portal",
        displayMessage:
          result.bookingIds.length > 1
            ? `Financials captured for ${result.bookingIds.length}-boat charter party`
            : "Financials captured at booking creation",
        newState: {
          boats: result.bookingIds.length,
          partyGmvCents,
          partyOwnerPayoutCents,
          expenseLineCount: totalExpenseLines,
          source: sourceOverride,
          agentCode,
        },
      });
    }

    // 5. Proposal send. AWAITED on purpose: the admin's toast must tell the
    //    truth. A failed send is logged on the timeline so the desk can see
    //    the customer never got it and hit Resend.
    const baseUrl = getBaseUrl();
    const proposalLink = result.publicToken
      ? `${baseUrl}/bookings/proposal/${result.publicToken}`
      : null;

    let emailSent: boolean | null = null;
    let smsSent: boolean | null = null;
    if (proposalLink && publishNow) {
      const b = input.bookings[0];
      if (sendProposalEmail) {
        const leadBoatName = await getBoatName(b.boatId);
        // Parties name the fleet honestly: "52ft Prestige + 1 more".
        const boatName = isParty
          ? leadBoatName
            ? `${leadBoatName} + ${input.bookings.length - 1} more`
            : undefined
          : leadBoatName;
        emailSent = await emailProposalToCustomer({
          customerName: b.customerName,
          customerEmail: b.customerEmail,
          proposalLink,
          boatName,
          isGroup: isParty,
        }).catch((err) => {
          console.error("Proposal email failed:", err);
          return false;
        });
      }
      if (sendProposalSms) {
        smsSent = b.customerPhone?.trim()
          ? await sendSms(
              b.customerPhone,
              `Kings Of The Sea: Your charter proposal is ready. View & accept: ${proposalLink}`
            )
              .then((r) => r.success)
              .catch((err) => {
                console.error("Proposal SMS failed:", err);
                return false;
              })
          : false;
      }
      const failed = [emailSent === false ? "email" : null, smsSent === false ? "text" : null].filter(
        (c): c is string => c !== null
      );
      if (failed.length > 0) {
        await bookingEventsService.logEvent({
          bookingId,
          eventType: BOOKING_EVENT_TYPES.UPDATED,
          actorType: "system",
          channel: "admin_portal",
          displayMessage: `Proposal ${failed.join(" and ")} failed to send — resend from this page`,
          metadata: { emailSent, smsSent },
        });
      }
    }

    return {
      success: true,
      data: {
        bookingId,
        publicToken: result.publicToken,
        groupId: result.groupId,
        proposalSent: publishNow,
        emailSent,
        smsSent,
      },
    };
  } catch (error) {
    console.error("createBookingFull error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: formatZodError(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create booking",
    };
  }
}
