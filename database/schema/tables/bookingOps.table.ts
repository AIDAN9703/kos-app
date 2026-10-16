import {
  pgTable,
  uuid,
  text,
  boolean,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings.table";

/**
 * Booking Ops - money figures per booking, first from the legacy Excel
 * workflow: expense (the sum of its expense lines), a GMV override, PAID,
 * sent to owner (kept equal to the paid owner payouts), plus the old sheet's
 * agent, commission and source columns.
 */
export const bookingOps = pgTable("booking_ops", {
  bookingId: uuid("booking_id")
    .notNull()
    .primaryKey()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // Financial (all in cents)
  expenseCents: bigint("expense_cents", { mode: "number" }),
  gmvCents: bigint("gmv_cents", { mode: "number" }),
  paidCents: bigint("paid_cents", { mode: "number" }),
  /** Paid out to the boat owner (USD cents): the PAID owner_payout rows (owner-payouts.service). */
  sentToOwnerCents: bigint("sent_to_owner_cents", { mode: "number" }),

  clientPaid: boolean("client_paid"),

  // Agent (free text - agent name/code)
  agentCode: text("agent_code"),

  // Commission split (cents)
  commissionAgentCents: bigint("commission_agent_cents", { mode: "number" }),
  commissionKosCents: bigint("commission_kos_cents", { mode: "number" }),
  commissionCents: bigint("commission_cents", { mode: "number" }), // legacy/total

  // Source (Getmyboat, Boatsetter, Direct, Website, etc.)
  sourceOverride: text("source_override"),

  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});
