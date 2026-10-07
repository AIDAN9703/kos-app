import "server-only";

import type Stripe from "stripe";
import { eq, sql } from "drizzle-orm";

import { db } from "@/database/db";
import { stripeEvents } from "@/database/schema";

/**
 * The stripe_event log: one row per Stripe event id, so a delivery Stripe
 * repeats or retries is handled once. Without transactions, the row is the
 * claim: an insert (or a takeover of a stale claim) that returns a row means
 * this delivery owns the event.
 */

/** A claim older than this belongs to a delivery that crashed or timed out. */
const STALE_CLAIM = sql`now() - interval '5 minutes'`;

type StripeEventClaim = "claimed" | "already_processed" | "in_progress";

export async function claimStripeEvent(event: Stripe.Event): Promise<StripeEventClaim> {
  const [claimed] = await db
    .insert(stripeEvents)
    .values({
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      stripeCreatedAt: new Date(event.created * 1000),
      claimedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: stripeEvents.id,
      set: { attempts: sql`${stripeEvents.attempts} + 1`, claimedAt: sql`now()` },
      setWhere: sql`${stripeEvents.processedAt} IS NULL AND (${stripeEvents.claimedAt} IS NULL OR ${stripeEvents.claimedAt} < ${STALE_CLAIM})`,
    })
    .returning({ id: stripeEvents.id });
  if (claimed) return "claimed";

  const [existing] = await db
    .select({ processedAt: stripeEvents.processedAt })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id))
    .limit(1);
  return existing?.processedAt ? "already_processed" : "in_progress";
}

export async function markStripeEventProcessed(eventId: string): Promise<void> {
  await db
    .update(stripeEvents)
    .set({ processedAt: new Date(), claimedAt: null, lastError: null })
    .where(eq(stripeEvents.id, eventId));
}

/** Release the claim so Stripe's retry can try again, keeping the reason. */
export async function markStripeEventFailed(eventId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await db
    .update(stripeEvents)
    .set({ claimedAt: null, lastError: message.slice(0, 2000) })
    .where(eq(stripeEvents.id, eventId));
}

/** Log an event we deliberately don't act on (wrong mode), as handled. */
export async function markStripeEventIgnored(event: Stripe.Event, reason: string): Promise<void> {
  await db
    .insert(stripeEvents)
    .values({
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      stripeCreatedAt: new Date(event.created * 1000),
      processedAt: new Date(),
      lastError: reason,
    })
    .onConflictDoNothing();
}
