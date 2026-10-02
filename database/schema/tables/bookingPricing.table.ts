import { boolean, integer, pgTable, uuid, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { bookings } from "./bookings.table";

/**
 * Booking Pricing Table
 * 
 * Financial snapshot at time of booking. 1:1 relationship with bookings.
 * Separated from bookings table to:
 * - Keep pricing logic isolated
 * - Allow pricing modifications without touching core booking
 * - Calculate balance due easily
 * 
 * NOTE: All monetary values are stored in CENTS (integer) for precision.
 * $10.50 = 1050 cents. Matches Stripe's API format.
 */
export const bookingPricing = pgTable("booking_pricing", {
  // Primary key is also the foreign key (1:1 relationship)
  bookingId: uuid("booking_id")
    .notNull()
    .primaryKey()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // Pricing breakdown (all in cents)
  basePriceCents: bigint("base_price_cents", { mode: "number" }).notNull(),
  captainFeeCents: bigint("captain_fee_cents", { mode: "number" }),
  cleaningFeeCents: bigint("cleaning_fee_cents", { mode: "number" }),
  serviceFeeCents: bigint("service_fee_cents", { mode: "number" }),
  /** The card fee this booking was priced at (snapshot of app settings):
      a percentage of every charge (bps, 399 = 3.99%) plus a fixed amount
      collected once with the first payment. Null bps = priced before the
      snapshot existed; the rate is then derived from service_fee_cents. */
  serviceFeeBps: integer("service_fee_bps"),
  serviceFeeFixedCents: integer("service_fee_fixed_cents").default(0).notNull(),
  /** Card-processing fee waived — set when the balance is paid off-card
      (Zelle / wire / cash). The fee stays stored for the record; the
      effective total drops it. */
  serviceFeeWaived: boolean("service_fee_waived").default(false).notNull(),
  taxAmountCents: bigint("tax_amount_cents", { mode: "number" }),
  discountAmountCents: bigint("discount_amount_cents", { mode: "number" }),
  discountCode: text("discount_code"),
    
  // Deposit and total (in cents)
  depositAmountCents: bigint("deposit_amount_cents", { mode: "number" }),
  totalAmountCents: bigint("total_amount_cents", { mode: "number" }).notNull(),
  currency: text("currency").default("USD").notNull(),

  // Payment schedule
  depositDueDate: timestamp("deposit_due_date", { mode: "date", withTimezone: true }),
  remainderDueDate: timestamp("remainder_due_date", { mode: "date", withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});
