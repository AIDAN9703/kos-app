import "server-only";

/**
 * Booking Expense Line Service
 * Manages typed expense breakdown per booking; aggregates ALL lines (owner
 * payout + fuel/crew/dockage/…) into booking_ops.expense_cents, so ops
 * revenue = GMV − every cost, not just the owner's cut.
 */

import { db } from "@/database/db";
import {
  bookingExpenseLines,
  bookings,
  boatPricingTiers,
  bookingOps,
} from "@/database/schema";
import { asc, eq } from "drizzle-orm";
import { bookingOpsService } from "@/features/bookings/services/booking-ops.service";
import type {
  BookingExpenseLine,
  BookingExpenseLineInput,
} from "@/features/bookings/booking-expense.types";

function mapRow(row: typeof bookingExpenseLines.$inferSelect): BookingExpenseLine {
  return {
    id: row.id,
    bookingId: row.bookingId,
    category: row.category,
    amountCents: row.amountCents,
    label: row.label,
    sortOrder: row.sortOrder,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const bookingExpenseLineService = {
  async getLines(bookingId: string): Promise<BookingExpenseLine[]> {
    const rows = await db
      .select()
      .from(bookingExpenseLines)
      .where(eq(bookingExpenseLines.bookingId, bookingId))
      .orderBy(asc(bookingExpenseLines.sortOrder), asc(bookingExpenseLines.createdAt));

    if (rows.length > 0) {
      return rows.map(mapRow);
    }

    const [opsRow] = await db
      .select({ expenseCents: bookingOps.expenseCents })
      .from(bookingOps)
      .where(eq(bookingOps.bookingId, bookingId))
      .limit(1);

    // Legacy seed: bookings from before line tracking carry only the manual
    // ops figure, which historically meant the owner payout.
    if (opsRow?.expenseCents != null) {
      return [
        {
          id: null,
          bookingId,
          category: "OWNER_PAYOUT",
          amountCents: opsRow.expenseCents,
          label: null,
          sortOrder: 0,
          source: "MANUAL",
          isSynthetic: true,
        },
      ];
    }

    return [];
  },

  async getDefaultsForBooking(bookingId: string): Promise<BookingExpenseLineInput[]> {
    const [booking] = await db
      .select({ pricingTierId: bookings.pricingTierId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking?.pricingTierId) {
      return [];
    }

    const [tier] = await db
      .select({ ownerPayoutCents: boatPricingTiers.ownerPayoutCents })
      .from(boatPricingTiers)
      .where(eq(boatPricingTiers.id, booking.pricingTierId))
      .limit(1);

    if (tier?.ownerPayoutCents == null) {
      return [];
    }

    return [
      {
        category: "OWNER_PAYOUT",
        amountCents: tier.ownerPayoutCents,
        label: null,
        sortOrder: 0,
        source: "BOAT_DEFAULT",
      },
    ];
  },

  async saveLines(
    bookingId: string,
    lines: BookingExpenseLineInput[]
  ): Promise<BookingExpenseLine[]> {
    const now = new Date();
    // Every category counts against revenue — owner payout, fuel, crew,
    // dockage alike. REV on the board means "GMV minus all costs".
    const expenseTotal = lines.reduce((sum, line) => sum + line.amountCents, 0);

    // Sequential, not transactional: the neon-http driver has no transaction
    // support (db.transaction throws at runtime). Delete-then-insert leaves a
    // brief window where lines are missing if the insert fails — acceptable
    // for an admin-only editor; the modal re-save recovers.
    await db
      .delete(bookingExpenseLines)
      .where(eq(bookingExpenseLines.bookingId, bookingId));

    let savedLines: BookingExpenseLine[] = [];
    if (lines.length > 0) {
      const inserted = await db
        .insert(bookingExpenseLines)
        .values(
          lines.map((line, index) => ({
            bookingId,
            category: line.category,
            amountCents: line.amountCents,
            label: line.label ?? null,
            sortOrder: line.sortOrder ?? index,
            source: line.source ?? "MANUAL",
            createdAt: now,
            updatedAt: now,
          }))
        )
        .returning();
      savedLines = inserted.map(mapRow);
    }

    await bookingOpsService.upsert(bookingId, {
      expenseCents: expenseTotal > 0 ? expenseTotal : null,
    });

    return savedLines;
  },
};
