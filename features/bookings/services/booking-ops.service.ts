import "server-only";

/**
 * Booking Ops Service
 * Manages operational/admin fields for bookings (Excel workflow fields)
 */

import { db } from "@/database/db";
import { bookingOps } from "@/database/schema";
import { eq } from "drizzle-orm";

type BookingOpsRow = typeof bookingOps.$inferSelect;

/** Every ops column except the key and timestamps. */
type BookingOpsData = Omit<BookingOpsRow, "bookingId" | "createdAt" | "updatedAt">;

/** Partial ops update: only the fields passed change. */
type BookingOpsInput = Partial<BookingOpsData>;

function toData(row: BookingOpsRow): BookingOpsData {
  const { bookingId: _bookingId, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = row;
  return data;
}

export const bookingOpsService = {
  async getByBookingId(bookingId: string): Promise<BookingOpsData | null> {
    const [row] = await db
      .select()
      .from(bookingOps)
      .where(eq(bookingOps.bookingId, bookingId))
      .limit(1);
    return row ? toData(row) : null;
  },

  async upsert(bookingId: string, input: BookingOpsInput): Promise<BookingOpsData> {
    // Undefined keys are skipped by Drizzle, so only the fields passed change.
    const [row] = await db
      .insert(bookingOps)
      .values({ bookingId, ...input })
      .onConflictDoUpdate({
        target: bookingOps.bookingId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();

    return toData(row);
  },
};
