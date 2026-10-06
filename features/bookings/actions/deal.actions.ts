"use server";

import * as deals from "@/features/bookings/deal.data";
import * as dealMoney from "@/features/bookings/deal-money.data";
import type { BookingExpenseLine, BookingExpenseLineInput } from "@/features/bookings/booking-expense.types";
import type { CreateBookingFullInput } from "@/features/bookings/booking.validation";
import { revalidateDeal } from "@/features/bookings/lib/revalidate-deal";
import type { ManualPaymentMethod } from "@/features/bookings/lib/manual-payment";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/**
 * Deal server actions (admins and brokers). Each is a thin wrapper: the data
 * layer (deal.data.ts, deal-money.data.ts) checks who's asking and does the
 * work; the action refreshes the deal's pages and reports the outcome.
 */

type Done = ActionResponse<null>;

async function run(
  bookingId: string,
  work: () => Promise<string | void>,
  fallback: string
): Promise<Done> {
  try {
    const message = await work();
    revalidateDeal(bookingId);
    return { success: true, data: null, message: message || undefined };
  } catch (error) {
    return actionError(error, fallback);
  }
}

// ============================================================================
// CREATE
// ============================================================================

/** The booking composer: a single booking or a whole charter party. */
export async function createBookingFull(
  input: CreateBookingFullInput
): Promise<ActionResponse<deals.CreateDealResult>> {
  try {
    const result = await deals.createDeal(input);
    revalidateDeal(result.bookingId);
    return { success: true, data: result };
  } catch (error) {
    return actionError(error, "Failed to create booking");
  }
}

// ============================================================================
// PIPELINE
// ============================================================================

export async function logDealContact(
  bookingId: string,
  contactMethod: deals.ContactMethod,
  content?: string
): Promise<Done> {
  return run(
    bookingId,
    async () => {
      const { pipelineAdvanced } = await deals.logDealContact(bookingId, contactMethod, content);
      return pipelineAdvanced ? "Contact logged — deal moved to Contacted" : "Contact logged";
    },
    "Failed to log contact"
  );
}

export async function addDealNote(bookingId: string, content: string): Promise<Done> {
  return run(bookingId, async () => {
    await deals.addDealNote(bookingId, content);
    return "Note added";
  }, "Failed to add note");
}

export async function toggleDealArchived(bookingId: string): Promise<Done> {
  return run(bookingId, async () => {
    const { archived } = await deals.toggleDealArchived(bookingId);
    return archived ? "Archived" : "Restored";
  }, "Failed to update deal");
}

export async function markDealLost(bookingId: string, reason: string): Promise<Done> {
  return run(bookingId, async () => {
    await deals.markDealLost(bookingId, reason);
    return "Deal marked as lost";
  }, "Failed to mark deal as lost");
}

// ============================================================================
// PROPOSAL LINK
// ============================================================================

export async function shareProposalLink(bookingId: string): Promise<Done> {
  return run(bookingId, async () => {
    await deals.shareProposalLink(bookingId);
  }, "Failed to activate the proposal link");
}

export async function sendProposalUpdate(
  bookingId: string,
  channels: { email: boolean; sms: boolean }
): Promise<Done> {
  return run(bookingId, async () => {
    const { sent, isFirstSend } = await deals.sendProposalUpdate(bookingId, channels);
    return `Proposal ${isFirstSend ? "sent" : "update sent"} by ${sent.join(" and ")}`;
  }, "Failed to send the proposal update");
}

// ============================================================================
// PEOPLE
// ============================================================================

/** Assign the deal to an admin or broker, or pass null to unassign. */
export async function assignAdminToBooking(bookingId: string, adminId: string | null): Promise<Done> {
  return run(bookingId, async () => {
    await deals.assignDealOwner(bookingId, adminId);
    return adminId == null ? "Admin unassigned" : "Admin assigned successfully";
  }, "Failed to assign admin");
}

export async function assignCaptainToBooking(bookingId: string, captainUserId: string | null): Promise<Done> {
  return run(bookingId, async () => {
    await deals.assignCaptain(bookingId, captainUserId);
    return captainUserId == null ? "Captain unassigned" : "Captain assigned successfully";
  }, "Failed to assign captain");
}

export async function addBookingCrewMember(
  bookingId: string,
  crewUserId: string,
  role?: string | null
): Promise<Done> {
  return run(bookingId, async () => {
    await deals.addCrewMember(bookingId, crewUserId, role);
    return "Crew member added";
  }, "Failed to add crew");
}

export async function removeBookingCrewMember(bookingId: string, bookingCrewId: string): Promise<Done> {
  return run(bookingId, async () => {
    await deals.removeCrewMember(bookingId, bookingCrewId);
    return "Crew member removed";
  }, "Failed to remove crew");
}

// ============================================================================
// STATUS
// ============================================================================

export async function markBookingBooked(bookingId: string): Promise<Done> {
  return run(bookingId, async () => {
    const booked = await deals.markDealBooked(bookingId);
    return booked > 1 ? `Booked — ${booked} boats locked in` : "Booked — the date is locked in";
  }, "Failed to mark as booked");
}

export async function markBookingCompleted(bookingId: string): Promise<Done> {
  return run(bookingId, async () => {
    await deals.markDealCompleted(bookingId);
    return "Booking marked as completed";
  }, "Failed to complete booking");
}

export async function cancelBooking(bookingId: string, reason: string): Promise<Done> {
  return run(bookingId, async () => {
    await deals.cancelDeal(bookingId, reason);
    return "Booking cancelled";
  }, "Failed to cancel booking");
}

// ============================================================================
// THE TRIP
// ============================================================================

/** Change exactly one booking field (validated per field). */
export async function updateBookingSingleField(bookingId: string, update: unknown): Promise<Done> {
  return run(bookingId, () => deals.updateDealField(bookingId, update), "Failed to update booking");
}

export async function shiftCharterPartyWindows(
  bookingId: string,
  deltaStartMs: number,
  deltaEndMs: number
): Promise<Done> {
  return run(bookingId, async () => {
    await deals.shiftCharterPartyWindows(bookingId, deltaStartMs, deltaEndMs);
  }, "Failed to move the rest of the party");
}

export async function addBoatToCharterParty(
  bookingId: string,
  input: { boatId: string; pricingTierId: string }
): Promise<Done> {
  return run(bookingId, async () => {
    await deals.addBoatToCharterParty(bookingId, input);
  }, "Failed to add the boat");
}

// ============================================================================
// MONEY
// ============================================================================

export async function updateBookingPricing(bookingId: string, input: unknown): Promise<Done> {
  return run(
    bookingId,
    () => dealMoney.updateDealPricing(bookingId, input),
    "Couldn't save the pricing. Please try again."
  );
}

export async function getBookingExpenseLines(
  bookingId: string
): Promise<ActionResponse<BookingExpenseLine[]>> {
  try {
    return { success: true, data: await dealMoney.getExpenseLines(bookingId) };
  } catch (error) {
    return actionError(error, "Failed to load expense lines");
  }
}

export async function getBookingExpenseDefaults(
  bookingId: string
): Promise<ActionResponse<BookingExpenseLineInput[]>> {
  try {
    return { success: true, data: await dealMoney.getExpenseDefaults(bookingId) };
  } catch (error) {
    return actionError(error, "Failed to load expense defaults");
  }
}

export async function saveBookingExpenseLines(
  bookingId: string,
  lines: BookingExpenseLineInput[]
): Promise<ActionResponse<BookingExpenseLine[]>> {
  try {
    const saved = await dealMoney.saveExpenseLines(bookingId, lines);
    revalidateDeal(bookingId);
    return { success: true, data: saved };
  } catch (error) {
    return actionError(error, "Failed to save expense lines");
  }
}

/** Money received off-card. The page refreshes even on failure: a race can leave the payment recorded. */
export async function recordBookingManualPaymentAction(
  bookingId: string,
  input: { amountCents: number; method: ManualPaymentMethod; waiveServiceFee: boolean }
): Promise<Done> {
  try {
    await dealMoney.recordManualPayment(bookingId, input);
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Failed to record payment");
  } finally {
    revalidateDeal(bookingId);
  }
}
