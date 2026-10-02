/**
 * Booking Ops Service
 * Manages operational/admin fields for bookings (Excel workflow fields)
 */

import { db } from "@/database/db";
import { bookingOps, bookingPricing } from "@/database/schema";
import { eq } from "drizzle-orm";
import {
  computeOpsBalanceClientCents,
  computeOpsBalanceOwnerCents,
  computeOpsRevenueCents,
} from "@/shared/lib/utils/ops-revenue";

type BookingOpsRow = typeof bookingOps.$inferSelect;

/** Every ops column except the key and timestamps. */
export type BookingOpsData = Omit<BookingOpsRow, "bookingId" | "createdAt" | "updatedAt">;

/**
 * Partial ops update. revenue and both balances are always recomputed here,
 * so callers can't set them.
 */
export type BookingOpsInput = Partial<
  Omit<BookingOpsData, "revenueCents" | "balanceOwnerCents" | "balanceClientCents">
>;

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
    const existing = await this.getByBookingId(bookingId);

    const [pricingRow] = await db
      .select({
        total: bookingPricing.totalAmountCents,
        serviceFee: bookingPricing.serviceFeeCents,
      })
      .from(bookingPricing)
      .where(eq(bookingPricing.bookingId, bookingId))
      .limit(1);
    const totalAmountCents = pricingRow?.total != null ? Number(pricingRow.total) : null;
    const serviceFeeCents = pricingRow?.serviceFee != null ? Number(pricingRow.serviceFee) : null;

    // The value after this write: the input when given, else what's stored.
    const merged = <K extends keyof BookingOpsInput>(key: K): BookingOpsData[K] | null =>
      input[key] !== undefined ? (input[key] as BookingOpsData[K]) : (existing?.[key] ?? null);

    const mergedGmv = merged("gmvCents");
    const mergedExpense = merged("expenseCents");
    const derived = {
      revenueCents: computeOpsRevenueCents(
        mergedGmv,
        totalAmountCents,
        mergedExpense,
        serviceFeeCents
      ),
      balanceOwnerCents: computeOpsBalanceOwnerCents(mergedExpense, merged("sentToOwnerCents")),
      balanceClientCents: computeOpsBalanceClientCents(
        mergedGmv,
        merged("paidCents"),
        totalAmountCents
      ),
    };

    // Undefined keys are skipped by Drizzle, so only the fields passed change.
    const [row] = await db
      .insert(bookingOps)
      .values({ bookingId, ...input, ...derived })
      .onConflictDoUpdate({
        target: bookingOps.bookingId,
        set: { ...input, ...derived, updatedAt: new Date() },
      })
      .returning();

    return toData(row);
  },
};
