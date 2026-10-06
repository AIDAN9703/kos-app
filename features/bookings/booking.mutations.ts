/**
 * Bookings Mutations (Server Actions) - CUD Operations Only
 */

"use server";

import { type ActionResponse } from "@/shared/lib/types/types";
import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingSingleFieldUpdateSchema } from "@/features/bookings/booking-single-field-update";
import type { BookingDetails } from "@/features/bookings/booking.types";
import { requireDealAccess, revalidateDeal } from "@/features/bookings/lib/deal-access";

/**
 * Update exactly one booking column (validated per-field). Admins, or the
 * broker the deal is assigned to.
 */
export async function updateBookingSingleField(
  id: string,
  rawUpdate: unknown
): Promise<ActionResponse<{ booking: BookingDetails }>> {
  const access = await requireDealAccess(id, "edit");
  if (access.error !== undefined) return { success: false, error: access.error };

  try {
    const actorId = access.session.user.id;
    const update = bookingSingleFieldUpdateSchema.parse(rawUpdate);
    const booking = await bookingService.applyBookingSingleFieldUpdate(id, update, actorId);
    revalidateDeal(id);
    return { success: true, data: { booking } };
  } catch (error) {
    console.error("Error updating booking field:", error);

    if (error && typeof error === "object" && "issues" in error) {
      const zodError = error as { issues: Array<{ path: string[]; message: string }> };
      const firstError = zodError.issues[0];
      return {
        success: false,
        error: firstError
          ? `${firstError.path.join(".")}: ${firstError.message}`
          : "Validation error",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update booking",
    };
  }
}

