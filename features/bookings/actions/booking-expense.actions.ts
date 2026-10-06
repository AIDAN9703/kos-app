"use server";

import { revalidatePath } from "next/cache";
import { bookingExpenseLineService } from "@/features/bookings/services/booking-expense-line.service";
import type { BookingExpenseLineInput } from "@/features/bookings/booking-expense.types";
import { getSession } from "@/shared/lib/utils/auth-utils";

export async function getBookingExpenseLines(bookingId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.isAdmin) {
      return { success: false as const, error: "Admin access required" };
    }

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
    const session = await getSession();
    if (!session?.user?.isAdmin) {
      return { success: false as const, error: "Admin access required" };
    }

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
    const session = await getSession();
    if (!session?.user?.isAdmin) {
      return { success: false as const, error: "Admin access required" };
    }

    const saved = await bookingExpenseLineService.saveLines(bookingId, lines);
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");

    return { success: true as const, lines: saved };
  } catch (error) {
    console.error("Failed to save booking expense lines:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to save expense lines",
    };
  }
}
