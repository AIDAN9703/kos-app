"use server";

import { bookingExpenseLineService } from "@/features/bookings/services/booking-expense-line.service";
import type { BookingExpenseLineInput } from "@/features/bookings/booking-expense.types";
import { requireDealAccess, revalidateDeal } from "@/features/bookings/lib/deal-access";

export async function getBookingExpenseLines(bookingId: string) {
  try {
    const access = await requireDealAccess(bookingId, "view-economics");
    if (access.error !== undefined) return { success: false as const, error: access.error };

    const lines = await bookingExpenseLineService.getLines(bookingId);
    return { success: true as const, lines };
  } catch (error) {
    console.error("Failed to get booking expense lines:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load expense lines",
    };
  }
}

export async function getBookingExpenseDefaults(bookingId: string) {
  try {
    const access = await requireDealAccess(bookingId, "view-economics");
    if (access.error !== undefined) return { success: false as const, error: access.error };

    const defaults = await bookingExpenseLineService.getDefaultsForBooking(bookingId);
    return { success: true as const, defaults };
  } catch (error) {
    console.error("Failed to get booking expense defaults:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load expense defaults",
    };
  }
}

export async function saveBookingExpenseLines(
  bookingId: string,
  lines: BookingExpenseLineInput[]
) {
  try {
    const access = await requireDealAccess(bookingId, "view-economics");
    if (access.error !== undefined) return { success: false as const, error: access.error };

    const saved = await bookingExpenseLineService.saveLines(bookingId, lines);
    revalidateDeal(bookingId);

    return { success: true as const, lines: saved };
  } catch (error) {
    console.error("Failed to save booking expense lines:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to save expense lines",
    };
  }
}
