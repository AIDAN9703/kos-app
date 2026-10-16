import { sql } from "drizzle-orm";
import { bigint, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { ownerPayoutMethodEnum, ownerPayoutStatusEnum } from "@/database/schema/enums";
import { bookings } from "./bookings.table";
import { ownerAccounts } from "./ownerAccounts.table";
import { users } from "./users.table";

/**
 * Every payout to an owner for a charter: a Stripe transfer to their direct
 * deposit account, or a Zelle payment the team records. What's paid on a
 * booking is the sum of its PAID rows (booking_ops.sent_to_owner_cents
 * follows it); what's owed comes from its OWNER_PAYOUT expense lines.
 */
export const ownerPayouts = pgTable(
  "owner_payout",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => ownerAccounts.id, { onDelete: "restrict" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    currency: text("currency").default("USD").notNull(),
    method: ownerPayoutMethodEnum("method").notNull(),
    status: ownerPayoutStatusEnum("status").default("PENDING").notNull(),
    /** The Stripe transfer (tr_…), for Stripe payouts. */
    stripeTransferId: text("stripe_transfer_id").unique(),
    /** What Stripe said when it refused. */
    failureReason: text("failure_reason"),
    /** A Zelle confirmation number or a note. */
    reference: text("reference"),
    paidAt: timestamp("paid_at", { mode: "date", withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("owner_payout_booking_idx").on(table.bookingId),
    index("owner_payout_account_idx").on(table.ownerAccountId),
    check("owner_payout_amount_positive", sql`${table.amountCents} > 0`),
    // One Stripe payout in flight per charter: a double click can't send two.
    uniqueIndex("owner_payout_one_pending_idx")
      .on(table.bookingId)
      .where(sql`${table.status} = 'PENDING'`),
  ]
);
