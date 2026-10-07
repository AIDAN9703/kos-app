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
    // A live key on a preview or test deployment would charge real cards
    // from a build nobody meant for customers. Refuse rather than guess.
    if (!config.stripeLive && /^(sk|rk)_live_/.test(config.stripeSecretKey ?? "")) {
      throw new Error("A live Stripe key is configured on a non-production deployment");
    }
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
