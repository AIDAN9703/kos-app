"use server";

/**
 * Admin Booking Actions
 * Server actions for admin to manage bookings
 */

import { requireDealAccess, revalidateDeal } from "@/features/bookings/lib/deal-access";

import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingCrewService } from "@/features/bookings/services/booking-crew.service";
import { bookingStatusService } from "@/features/bookings/services/booking-status.service";
import {
  availabilityService,
  isOverlapConstraintError,
  SlotUnavailableError,
} from "@/features/availability/services/availability.service";

/** Assign admin to booking, or pass null to unassign */
export async function assignAdminToBooking(bookingId: string, adminId: string | null) {
  try {
    const authResult = await requireDealAccess(bookingId, "assign");
    if (authResult.error) return { success: false, error: authResult.error };
    if (!bookingId) {
      return { success: false, error: "Booking ID is required" };
    }

    await bookingService.assignAdmin(bookingId, adminId, authResult.session!.user.id!);
    revalidateDeal(bookingId);

    return {
      success: true,
      message: adminId == null ? "Admin unassigned" : "Admin assigned successfully",
    };
  } catch (error) {
    console.error("Error assigning admin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign admin",
    };
  }
}

/** Add a crew member to `booking_crew` (must have active crew profile). */
export async function addBookingCrewMember(
  bookingId: string,
  crewUserId: string,
  role?: string | null
) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error) return { success: false, error: authResult.error };
    if (!bookingId || !crewUserId) {
      return { success: false, error: "Booking and crew user are required" };
    }

    await bookingCrewService.addMember(
      bookingId,
      crewUserId,
      authResult.session!.user.id!,
      role ?? null
    );

    revalidateDeal(bookingId);

    return { success: true, message: "Crew member added" };
  } catch (error) {
    console.error("Error adding booking crew:", error);
    const msg = error instanceof Error ? error.message : "Failed to add crew";
    if (/unique|duplicate/i.test(msg)) {
      return { success: false, error: "That crew member is already on this booking." };
    }
    return { success: false, error: msg };
  }
}

/** Remove a `booking_crew` row */
export async function removeBookingCrewMember(bookingId: string, bookingCrewId: string) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error) return { success: false, error: authResult.error };
    if (!bookingId || !bookingCrewId) {
      return { success: false, error: "Booking and crew assignment are required" };
    }

    await bookingCrewService.removeMember(
      bookingCrewId,
      bookingId,
      authResult.session!.user.id!
    );

    revalidateDeal(bookingId);

    return { success: true, message: "Crew member removed" };
  } catch (error) {
    console.error("Error removing booking crew:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove crew",
    };
  }
}

/** Assign captain (`bookings.captain_user_id`), or pass null to unassign */
export async function assignCaptainToBooking(bookingId: string, captainUserId: string | null) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error) return { success: false, error: authResult.error };
    if (!bookingId) {
      return { success: false, error: "Booking ID is required" };
    }

    await bookingService.assignCaptain(bookingId, captainUserId, authResult.session!.user.id!);
    revalidateDeal(bookingId);

    return {
      success: true,
      message: captainUserId == null ? "Captain unassigned" : "Captain assigned successfully",
    };
  } catch (error) {
    console.error("Error assigning captain:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign captain",
    };
  }
}

/**
 * "They said yes on the phone" — PROPOSED → BOOKED without the customer
 * clicking anything. Books every open boat in the party. Checks each slot
 * first; the DB's no-overlap constraint is the backstop.
 */
export async function markBookingBooked(bookingId: string) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error !== undefined) return { success: false, error: authResult.error };
    const adminId = authResult.session.user.id;

    const party = await bookingService.getChargeableParty(bookingId);
    if (!party || party.length === 0) return { success: false, error: "Booking not found" };
    const open = party.filter((m) => m.booking.bookingStatus === "PROPOSED");
    if (open.length === 0) {
      return { success: false, error: "Only a proposal can be marked booked." };
    }

    for (const m of open) {
      const b = m.booking;
      if (b.boatId && b.startDateTime && b.endDateTime) {
        try {
          await availabilityService.assertSlotAvailable(
            b.boatId,
            new Date(b.startDateTime),
            new Date(b.endDateTime),
            b.id
          );
        } catch (error) {
          if (error instanceof SlotUnavailableError) {
            return {
              success: false,
              error: `${m.boat?.name ?? "That boat"} is taken on the calendar for this window — move the trip first.`,
            };
          }
          throw error;
        }
      }
    }

    let booked = 0;
    for (const m of open) {
      try {
        await bookingStatusService.markBooked(m.booking.id, {
          changedByUserId: adminId,
          reason: "Marked as booked by admin",
          actorType: "admin",
          channel: "admin_portal",
        });
        booked += 1;
      } catch (error) {
        if (isOverlapConstraintError(error)) {
          return {
            success: false,
            error: `${m.boat?.name ?? "A boat"} was taken at the same moment — ${booked} of ${open.length} booked; move that trip and retry.`,
          };
        }
        throw error;
      }
    }

    revalidateDeal(bookingId);
    return { success: true, message: booked > 1 ? `Booked — ${booked} boats locked in` : "Booked — the date is locked in" };
  } catch (error) {
    console.error("Error marking booking booked:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as booked",
    };
  }
}

/** Mark a booked trip as completed (the charter happened). */
export async function markBookingCompleted(bookingId: string) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error) return { success: false, error: authResult.error };

    await bookingStatusService.complete(bookingId, authResult.session!.user.id);

    revalidateDeal(bookingId);

    return { success: true, message: "Booking marked as completed" };
  } catch (error) {
    console.error("Error completing booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete booking",
    };
  }
}

/** Cancel a booking with a reason (any active status). */
export async function cancelBooking(bookingId: string, reason: string) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error) return { success: false, error: authResult.error };

    const trimmed = reason?.trim();
    if (!trimmed) return { success: false, error: "A cancellation reason is required" };

    await bookingStatusService.cancel(bookingId, trimmed, authResult.session!.user.id);

    revalidateDeal(bookingId);

    return { success: true, message: "Booking cancelled" };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel booking",
    };
  }
}

/**
 * Apply the edited boat's start/end deltas to every OTHER boat in its
 * charter party — start and end move independently, so an end-time-only
 * change (longer/shorter trip) propagates just like a date move, and any
 * deliberate stagger between boats stays intact. Runs through applyBookingSingleFieldUpdate so every sibling
 * gets the same availability re-check and timeline event a manual edit
 * would. Sequential and non-transactional (neon-http) — a mid-party failure
 * reports which boat stopped it, with earlier boats already moved.
 */
export async function shiftCharterPartyWindows(
  bookingId: string,
  deltaStartMs: number,
  deltaEndMs: number
) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error !== undefined) return { success: false, error: authResult.error };
    const adminId = authResult.session.user.id;

    if (!Number.isFinite(deltaStartMs)) deltaStartMs = 0;
    if (!Number.isFinite(deltaEndMs)) deltaEndMs = 0;
    if (deltaStartMs === 0 && deltaEndMs === 0) {
      return { success: true, moved: 0 };
    }

    const party = await bookingService.getChargeableParty(bookingId);
    const siblings = (party ?? []).filter(
      (m) =>
        m.booking.id !== bookingId &&
        m.booking.bookingStatus !== "CANCELLED" &&
        m.booking.startDateTime != null &&
        m.booking.endDateTime != null
    );

    let moved = 0;
    for (const m of siblings) {
      const start = new Date(new Date(m.booking.startDateTime as Date).getTime() + deltaStartMs);
      const end = new Date(new Date(m.booking.endDateTime as Date).getTime() + deltaEndMs);
      try {
        await bookingService.applyBookingSingleFieldUpdate(
          m.booking.id,
          {
            field: "tripWindow",
            value: { startDateTime: start.toISOString(), endDateTime: end.toISOString() },
          },
          adminId
        );
        moved += 1;
      } catch (error) {
        console.error("Party shift failed on sibling:", m.booking.id, error);
        const name = m.boat?.name ?? "one of the boats";
        return {
          success: false,
          moved,
          error: `${name} couldn't move (likely a calendar conflict). ${moved} of ${siblings.length} other boats were moved — fix ${name} on its own page.`,
        };
      }
    }

    revalidateDeal(bookingId);
    return { success: true, moved };
  } catch (error) {
    console.error("Error shifting charter party:", error);
    return { success: false, moved: 0, error: "Failed to move the rest of the party" };
  }
}

/**
 * "Actually, we want another boat" — grow this booking into a charter party.
 * The sibling joins as PROPOSED under the same proposal link; resend it so the
 * customer sees (and re-accepts) the bigger party.
 */
export async function addBoatToCharterParty(
  bookingId: string,
  input: { boatId: string; pricingTierId: string }
) {
  try {
    const authResult = await requireDealAccess(bookingId, "edit");
    if (authResult.error !== undefined) return { success: false, error: authResult.error };

    const result = await bookingService.addBoatToParty(
      bookingId,
      input,
      authResult.session.user.id
    );
    revalidateDeal(bookingId);
    return { success: true, siblingId: result.siblingId };
  } catch (error) {
    console.error("Error adding boat to party:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add the boat",
    };
  }
}
