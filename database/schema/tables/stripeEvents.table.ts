import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Every Stripe webhook event we've received, keyed by Stripe's event id.
 *
 * Stripe delivers each event at least once and retries for up to three days,
 * so the same event can arrive more than once. A delivery first claims the
 * row; one with processedAt set is never handled again, and a claim older
 * than a few minutes (a crashed attempt) can be taken over by a retry.
 * Doubles as the log for "did Stripe tell us?" when a payment looks wrong.
 */
export const stripeEvents = pgTable(
  "stripe_event",
  {
    /** Stripe's event id (evt_…). */
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    livemode: boolean("livemode").notNull(),
    /** When Stripe created the event. */
    stripeCreatedAt: timestamp("stripe_created_at", { mode: "date", withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    /** Set while a delivery is handling the event; cleared when it fails. */
    claimedAt: timestamp("claimed_at", { mode: "date", withTimezone: true }),
    /** Set once the event was handled (or deliberately ignored). */
    processedAt: timestamp("processed_at", { mode: "date", withTimezone: true }),
    /** Deliveries that reached us. */
    attempts: integer("attempts").default(1).notNull(),
    /** Why the last attempt failed, or why the event was ignored. */
    lastError: text("last_error"),
  },
  (table) => [index("stripe_event_type_idx").on(table.type)]
);
