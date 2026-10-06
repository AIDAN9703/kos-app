"use server";

/**
 * Lead-phase deal actions on the unified booking hub — logging contact,
 * notes, archiving, and losing a deal. Everything writes to the
 * one activity feed (booking_event) and derives the one pipeline
 * (docs/UNIFIED_BOOKINGS_PLAN.md).
 */

import { eq } from "drizzle-orm";

import { db } from "@/database/db";
import { boats, bookings } from "@/database/schema";
import { bookingEventsService } from "@/features/bookings/services/booking-events.service";
import { BOOKING_EVENT_TYPES } from "@/features/bookings/booking-events.constants";
import { sendProposalEmail } from "@/shared/lib/services/email.service";
import { sendSms } from "@/shared/lib/services/twilio.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import { requireDealAccess, revalidateDeal } from "@/features/bookings/lib/deal-access";

type DealActionResult = { success: boolean; error?: string; message?: string };

const CONTACT_METHODS = ["EMAIL", "PHONE", "SMS", "IN_PERSON", "OTHER"] as const;
type ContactMethod = (typeof CONTACT_METHODS)[number];


async function getDeal(bookingId: string) {
  const [deal] = await db
    .select({
      id: bookings.id,
      bookingStatus: bookings.bookingStatus,
      firstContactedAt: bookings.firstContactedAt,
      archivedAt: bookings.archivedAt,
      assignedAdminId: bookings.assignedAdminId,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  return deal ?? null;
}

/**
 * Log a contact attempt. The first one marks the deal "Contacted" on the
 * pipeline (firstContactedAt) — automation, no manual stage clicks.
 */
export async function logDealContact(
  bookingId: string,
  contactMethod: ContactMethod,
  content?: string
): Promise<DealActionResult & { pipelineAdvanced?: boolean }> {
  try {
    const adminAuth = await requireDealAccess(bookingId, "edit");
    if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };
    const session = adminAuth.session;

    if (!CONTACT_METHODS.includes(contactMethod)) {
      return { success: false, error: "Invalid contact method" };
    }
    const deal = await getDeal(bookingId);
    if (!deal) return { success: false, error: "Deal not found" };

    await bookingEventsService.logContact({
      bookingId,
      actorId: session.user.id,
      contactMethod,
      content: content?.trim() || null,
    });

    const pipelineAdvanced = deal.firstContactedAt == null;
    if (pipelineAdvanced) {
      await db
        .update(bookings)
        .set({ firstContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    }

    revalidateDeal(bookingId);
    return {
      success: true,
      pipelineAdvanced,
      message: pipelineAdvanced ? "Contact logged — deal moved to Contacted" : "Contact logged",
    };
  } catch (error) {
    console.error("Error logging deal contact:", error);
    return { success: false, error: "Failed to log contact" };
  }
}

export async function addDealNote(bookingId: string, content: string): Promise<DealActionResult> {
  try {
    const adminAuth = await requireDealAccess(bookingId, "edit");
    if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };
    const session = adminAuth.session;

    const trimmed = content?.trim();
    if (!trimmed) return { success: false, error: "Note cannot be empty" };
    const deal = await getDeal(bookingId);
    if (!deal) return { success: false, error: "Deal not found" };

    await bookingEventsService.logNote({
      bookingId,
      actorId: session.user.id,
      content: trimmed,
      noteType: "GENERAL",
    });

    revalidateDeal(bookingId);
    return { success: true, message: "Note added" };
  } catch (error) {
    console.error("Error adding deal note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

/** Archive hides the deal from the default master list (boss's archive bucket). */
export async function toggleDealArchived(bookingId: string): Promise<DealActionResult> {
  try {
    const adminAuth = await requireDealAccess(bookingId, "edit");
    if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };
    const session = adminAuth.session;

    const deal = await getDeal(bookingId);
    if (!deal) return { success: false, error: "Deal not found" };

    const archiving = deal.archivedAt == null;
    await db
      .update(bookings)
      .set({ archivedAt: archiving ? new Date() : null, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));

    await bookingEventsService.logEvent({
      bookingId,
      eventType: archiving ? "deal.archived" : "deal.unarchived",
      actorType: "admin",
      actorId: session.user.id,
      channel: "admin_portal",
      displayMessage: archiving ? "Archived" : "Restored from archive",
    });

    revalidateDeal(bookingId);
    return { success: true, message: archiving ? "Archived" : "Restored" };
  } catch (error) {
    console.error("Error toggling deal archive:", error);
    return { success: false, error: "Failed to update deal" };
  }
}

/**
 * Copying the proposal link IS publishing it — the customer is about to hold
 * a working URL. Stamps publishedAt on first share so the public proposal page
 * (which refuses unpublished tokens) accepts it, and logs the share once.
 */
export async function shareProposalLink(bookingId: string): Promise<DealActionResult> {
  try {
    const adminAuth = await requireDealAccess(bookingId, "edit");
    if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };
    const session = adminAuth.session;

    const [row] = await db
      .select({
        id: bookings.id,
        publicToken: bookings.publicToken,
        publishedAt: bookings.publishedAt,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    if (!row?.publicToken) return { success: false, error: "No proposal link exists for this booking" };

    if (!row.publishedAt) {
      await db
        .update(bookings)
        .set({ publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
      await bookingEventsService.logEvent({
        bookingId,
        eventType: BOOKING_EVENT_TYPES.PROPOSAL_PUBLISHED,
        actorType: "admin",
        actorId: session.user.id,
        channel: "admin_portal",
        displayMessage: "Proposal link shared with the customer",
        metadata: { publicToken: row.publicToken, via: "copy_link" },
      });
      revalidateDeal(bookingId);
    }
    return { success: true };
  } catch (error) {
    console.error("Error sharing proposal link:", error);
    return { success: false, error: "Failed to activate the proposal link" };
  }
}

/**
 * Re-send the proposal to the customer after edits — SAME link, so there is
 * only ever one proposal URL per deal. Email and/or SMS per the admin's
 * choice; stamps publishedAt if this is somehow the first share, and logs one
 * timeline event so the whole desk can see the customer was notified.
 */
export async function sendProposalUpdate(
  bookingId: string,
  channels: { email: boolean; sms: boolean }
): Promise<DealActionResult> {
  try {
    const adminAuth = await requireDealAccess(bookingId, "edit");
    if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };
    const session = adminAuth.session;

    if (!channels.email && !channels.sms) {
      return { success: false, error: "Pick at least one channel (email or text)" };
    }

    const [row] = await db
      .select({
        id: bookings.id,
        publicToken: bookings.publicToken,
        publishedAt: bookings.publishedAt,
        bookingStatus: bookings.bookingStatus,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        customerPhone: bookings.customerPhone,
        bookingGroupId: bookings.bookingGroupId,
        boatName: boats.name,
      })
      .from(bookings)
      .leftJoin(boats, eq(bookings.boatId, boats.id))
      .where(eq(bookings.id, bookingId));

    if (!row?.publicToken) {
      return { success: false, error: "No proposal link exists for this booking" };
    }
    // The link serves the whole funnel: proposal while PROPOSED, payment page
    // once booked. Settled deals have nothing left to send.
    if (!["PROPOSED", "BOOKED"].includes(row.bookingStatus)) {
      return { success: false, error: "This deal is settled — nothing left to send" };
    }
    const isPaymentStage = row.bookingStatus === "BOOKED";
    if (channels.email && !row.customerEmail?.trim()) {
      return { success: false, error: "This customer has no email on file" };
    }
    if (channels.sms && !row.customerPhone?.trim()) {
      return { success: false, error: "This customer has no phone number on file" };
    }

    const proposalLink = `${getBaseUrl()}/bookings/proposal/${row.publicToken}`;
    const isFirstSend = !row.publishedAt;

    // Sending IS publishing — the customer is about to hold a working URL.
    if (isFirstSend) {
      await db
        .update(bookings)
        .set({ publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));
    }

    const sent: string[] = [];
    if (channels.email && row.customerEmail) {
      const ok = await sendProposalEmail({
        customerName: row.customerName ?? "there",
        customerEmail: row.customerEmail,
        proposalLink,
        boatName: row.boatName ?? undefined,
        isGroup: row.bookingGroupId != null,
        isUpdate: !isFirstSend,
      });
      if (!ok) return { success: false, error: "Email failed to send — try again" };
      sent.push("email");
    }
    if (channels.sms && row.customerPhone) {
      const body = isPaymentStage
        ? `Kings Of The Sea: Complete your charter booking here: ${proposalLink}`
        : isFirstSend
          ? `Kings Of The Sea: Your charter proposal is ready. View it and pay to book: ${proposalLink}`
          : `Kings Of The Sea: Your charter proposal has been updated. Latest details: ${proposalLink}`;
      const smsResult = await sendSms(row.customerPhone, body);
      if (!smsResult.success) {
        // Email may already be out — report the partial send honestly.
        if (sent.length > 0) {
          return { success: false, error: "Email sent, but the text failed — try SMS again" };
        }
        return { success: false, error: "Text failed to send — try again" };
      }
      sent.push("text");
    }

    await bookingEventsService.logEvent({
      bookingId,
      eventType: isFirstSend
        ? BOOKING_EVENT_TYPES.PROPOSAL_PUBLISHED
        : BOOKING_EVENT_TYPES.PROPOSAL_UPDATE_SENT,
      actorType: "admin",
      actorId: session.user.id,
      channel: "admin_portal",
      displayMessage: isPaymentStage
        ? `Payment link re-sent by ${sent.join(" and ")}`
        : isFirstSend
          ? `Proposal sent to the customer by ${sent.join(" and ")}`
          : `Updated proposal re-sent by ${sent.join(" and ")}`,
      metadata: { publicToken: row.publicToken, channels: sent },
    });

    revalidateDeal(bookingId);
    return { success: true, message: `Proposal ${isFirstSend ? "sent" : "update sent"} by ${sent.join(" and ")}` };
  } catch (error) {
    console.error("Error sending proposal update:", error);
    return { success: false, error: "Failed to send the proposal update" };
  }
}

/** Lose an INQUIRY-stage deal — status CANCELLED with the reason recorded. */
export async function markDealLost(bookingId: string, reason: string): Promise<DealActionResult> {
  try {
    const adminAuth = await requireDealAccess(bookingId, "edit");
    if (adminAuth.error !== undefined) return { success: false, error: adminAuth.error };
    const session = adminAuth.session;

    const trimmed = reason?.trim();
    if (!trimmed) return { success: false, error: "A reason is required" };
    const deal = await getDeal(bookingId);
    if (!deal) return { success: false, error: "Deal not found" };

    await bookingStatusService.cancel(bookingId, trimmed, session.user.id);
    // The menu promises "moves to the archive bucket" — make it true.
    await db
      .update(bookings)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));

    revalidateDeal(bookingId);
    return { success: true, message: "Deal marked as lost" };
  } catch (error) {
    console.error("Error marking deal lost:", error);
    return { success: false, error: "Failed to mark deal as lost" };
  }
}
