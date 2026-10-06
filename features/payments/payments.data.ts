import "server-only";

import * as settlement from "@/features/payments/stripe-settlement.service";
import { UserFacingError } from "@/shared/lib/errors";

/**
 * Payments data layer: what Stripe and the payment-success page may do.
 * Neither has a session. The webhook proves itself with Stripe's signature;
 * the success page with a real checkout session id, which Stripe confirms is
 * complete before anything is settled.
 */

/** A webhook delivery: verified by its signature, then settled. Throws so Stripe retries. */
export async function handleStripeWebhook(body: string, signature: string | null): Promise<void> {
  if (!signature) throw new UserFacingError("Missing stripe signature");
  const event = settlement.verifyWebhookSignature(body, signature);
  if (!event) throw new UserFacingError("Webhook signature verification failed");
  await settlement.processStripeEvent(event);
}

/** The payment-success page's check: settle and book if the webhook hasn't, and report what was paid. */
export async function verifyCheckout(sessionId: string | null): Promise<settlement.CheckoutVerification> {
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) throw new UserFacingError("Invalid session_id");
  return settlement.verifyCheckoutSession(sessionId);
}
