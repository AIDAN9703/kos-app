/**
 * Centralized Stripe service
 * Single source of truth for Stripe client and shared helpers.
 */

import Stripe from "stripe";
import { db } from "@/database/db";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import config from "@/shared/lib/config";

const STRIPE_API_VERSION = "2025-07-30.basil" as const;

let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client instance (singleton, config-based)
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(config.stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return stripeInstance;
}

/**
 * The Stripe customer to charge or bill.
 *
 * For an account: its saved customer. If none is saved yet, an existing Stripe
 * customer with the same email is adopted only when the account has verified
 * that email; otherwise anyone could set their email to someone else's and
 * open that person's billing portal. The result is saved on the account.
 *
 * For a guest checkout (no account): reuse the customer with the booking's
 * email, or create one.
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name?: string | null,
  userId?: string | null
): Promise<string> {
  const stripe = getStripe();

  if (userId) {
    const [user] = await db
      .select({
        stripeCustomerId: users.stripeCustomerId,
        email: users.email,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.stripeCustomerId) return user.stripeCustomerId;

    const adopted = user?.emailVerified
      ? (await stripe.customers.list({ email: user.email, limit: 1 })).data[0]?.id
      : undefined;
    const customerId =
      adopted ?? (await stripe.customers.create({ email, name: name || undefined })).id;

    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return customerId;
  }

  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
  });
  return customer.id;
}

/**
 * Extract PaymentIntent ID from Stripe value (string or expanded object).
 * Use for session.payment_intent, invoice payments, etc.
 */
export function extractPaymentIntentId(
  value: string | Stripe.PaymentIntent | null | undefined
): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

/**
 * Get PaymentIntent ID from an Invoice.
 * Stripe moved payment_intent from top-level to invoice.payments.data[].payment.payment_intent.
 * If not in webhook payload, fetches invoice with expand.
 */
export async function getInvoicePaymentIntentId(
  invoice: Stripe.Invoice
): Promise<string | undefined> {
  const firstPayment = invoice.payments?.data?.[0];
  const pi = firstPayment?.payment?.payment_intent;
  if (pi) return extractPaymentIntentId(pi);

  const invoiceId = invoice.id;
  if (!invoiceId) return undefined;

  const stripe = getStripe();
  const expanded = await stripe.invoices.retrieve(invoiceId, {
    expand: ["payments"],
  });
  const expandedPayment = expanded.payments?.data?.[0];
  const expandedPi = expandedPayment?.payment?.payment_intent;
  return expandedPi ? extractPaymentIntentId(expandedPi) : undefined;
}
