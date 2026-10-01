/**
 * Bookings Mutations (Server Actions) - CUD Operations Only
 */

"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { type ActionResponse } from "@/shared/lib/types/types";
import { bookingService } from "@/features/bookings/services/booking.service";
import { bookingSingleFieldUpdateSchema } from "@/features/bookings/booking-single-field-update";
import type { BookingDetails } from "@/features/bookings/booking.types";

/**
 * Admin: update exactly one booking column (validated per-field).
 */
export async function updateBookingSingleField(
  id: string,
  rawUpdate: unknown
): Promise<ActionResponse<{ booking: BookingDetails }>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Authentication required" };
  }

  if (!session?.user?.isAdmin) {
    return { success: false, error: "Admin access required" };
  }

  try {
    const actorId = session.user.id;
    if (!actorId) {
      return { success: false, error: "Admin user id missing" };
    }

    const update = bookingSingleFieldUpdateSchema.parse(rawUpdate);
    const booking = await bookingService.applyBookingSingleFieldUpdate(id, update, actorId);
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${id}`);
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

