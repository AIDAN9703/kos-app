import { pgTable, uuid, text, bigint, timestamp, index, unique, type AnyPgColumn } from "drizzle-orm/pg-core";
import { 
  paymentStatusEnum, 
  paymentTypeEnum, 
  paymentMethodTypeEnum, 
  payableTypeEnum 
} from "@/database/schema/enums";

/**
 * Payments Table
 * 
 * Generic payment tracking table. Polymorphic design allows payments
 * to be attached to any payable entity (bookings, event tickets, etc.)
 * 
 * One booking can have many payments (deposit, remainder, refunds).
 * Money in is a SUCCEEDED row of any type but REFUND; a SUCCEEDED REFUND row
 * is money given back. Net paid = money in − refunds (see netPaidCentsSql).
 * 
 * NOTE: All monetary values are stored in CENTS (integer) for precision.
 * $10.50 = 1050 cents. Matches Stripe's API format.
 */
export const payments = pgTable("payment", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),

  // Polymorphic relationship - what this payment is for
  payableType: payableTypeEnum("payable_type").notNull(),
  payableId: uuid("payable_id").notNull(),

  // Payment details (amount in cents)
  paymentType: paymentTypeEnum("payment_type").notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  currency: text("currency").default("USD").notNull(),
  status: paymentStatusEnum("status").default("PENDING").notNull(),

  // How the payment was collected
  paymentMethodType: paymentMethodTypeEnum("payment_method_type").notNull(),
  paymentMethodDetail: text("payment_method_detail"), // card, bank_transfer, cash, check, etc.

  // Stripe integration
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentLinkId: text("stripe_payment_link_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  stripeCustomerId: text("stripe_customer_id"),

  // Refund rows (paymentType REFUND): the Stripe refund (re_…) and the charge
  // row it gives money back on. One Stripe refund on a charter-party payment
  // is split across the boats' rows, so the pair is unique, not the refund id.
  stripeRefundId: text("stripe_refund_id"),
  refundedPaymentId: uuid("refunded_payment_id").references((): AnyPgColumn => payments.id, {
    onDelete: "set null",
  }),

  // Admin notes for manual payments
  notes: text("notes"),

  // Timestamps
  processedAt: timestamp("processed_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Index for looking up payments by payable
  index("payment_payable_idx").on(table.payableType, table.payableId),
  // Index for status filtering
  index("payment_status_idx").on(table.status),
  // Index for Stripe lookups
  index("payment_stripe_intent_idx").on(table.stripePaymentIntentId),
  index("payment_stripe_session_idx").on(table.stripeCheckoutSessionId),
  unique("payment_stripe_refund_unique").on(table.stripeRefundId, table.refundedPaymentId),
]);
