import "server-only";

import { z, type ZodTypeAny } from "zod";
import { AccessDenied, invalidFieldsFrom, UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { isUuid } from "@/shared/lib/utils/general-utils";
import { assertMyOwnerRole } from "./owner-accounts.data";
import * as accountsService from "./owner-accounts.service";
import * as payoutsService from "./owner-payouts.service";
import type { OwnerPayouts, OwnerPayoutSetup } from "./owner-accounts.types";
import {
  payoutMethodSchema,
  zelleContactSchema,
  zellePayoutSchema,
} from "./owner-accounts.validation";

/**
 * Owner payouts. In the owner portal, the Owner role sets up how they're
 * paid (direct deposit through Stripe, or Zelle). Direct deposit goes out
 * on its own (the daily cron); recording Zelle is for staff who record
 * payments.
 */

function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw invalidFieldsFrom(result.error);
  return result.data;
}

function id(value: string, what: string): string {
  if (!isUuid(value)) throw new UserFacingError(`${what} not found`, 404);
  return value;
}

// ── Owner portal: how they're paid ──────────────────────────────────────────

export async function getMyPayoutSetup(): Promise<OwnerPayoutSetup> {
  const { current } = await assertMyOwnerRole();
  return accountsService.getPayoutSetup(current.accountId);
}

/** Starts (or continues) direct deposit setup; returns the Stripe page to send them to. */
export async function startMyDirectDeposit(): Promise<string> {
  const { current, user } = await assertMyOwnerRole();
  return payoutsService.stripeOnboardingLink(current.accountId, user.email, getBaseUrl());
}

/** Back from Stripe: read where their setup stands. */
export async function syncMyDirectDeposit(): Promise<OwnerPayoutSetup> {
  const { current } = await assertMyOwnerRole();
  return payoutsService.syncStripeAccount(current.accountId);
}

export async function openMyStripeDashboard(): Promise<string> {
  const { current } = await assertMyOwnerRole();
  return payoutsService.stripeDashboardLink(current.accountId);
}

export async function saveMyZelle(input: unknown): Promise<void> {
  const { current } = await assertMyOwnerRole();
  const { zelleContact } = parse(z.object({ zelleContact: zelleContactSchema }), input);
  await payoutsService.saveZelle(current.accountId, zelleContact ?? null);
}

export async function chooseMyPayoutMethod(method: unknown): Promise<void> {
  const { current } = await assertMyOwnerRole();
  await payoutsService.choosePayoutMethod(current.accountId, parse(payoutMethodSchema, method));
}

// ── Admin: paying owners ────────────────────────────────────────────────────

export async function getOwnerPayouts(accountId: string): Promise<OwnerPayouts> {
  await assertCan({ booking: ["record-payment"] });
  return payoutsService.listPayouts(id(accountId, "Owner"));
}

/** Owed now per owner (trip over, not yet paid), for the owners list. */
export async function getOwedNowByOwner(): Promise<Map<string, number>> {
  await assertCan({ booking: ["record-payment"] });
  return payoutsService.owedNowByAccount();
}

export async function recordOwnerZellePayout(accountId: string, input: unknown): Promise<void> {
  const me = await assertCan({ booking: ["record-payment"] });
  const { bookingId, amountDollars, paidOn, reference, notifyOwner } = parse(
    zellePayoutSchema,
    input
  );
  await payoutsService.recordZellePayout(
    id(accountId, "Owner"),
    {
      bookingId,
      amountCents: Math.round(amountDollars * 100),
      paidOn,
      reference: reference ?? null,
      notifyOwner,
    },
    me.id
  );
}

export async function removeOwnerZellePayout(accountId: string, payoutId: string): Promise<void> {
  await assertCan({ booking: ["record-payment"] });
  await payoutsService.removeZellePayout(id(accountId, "Owner"), id(payoutId, "Payout"));
}

/** Re-reads an owner's Stripe setup (e.g. after they finish it). */
export async function refreshOwnerDirectDeposit(accountId: string): Promise<OwnerPayoutSetup> {
  await assertCan({ boat: ["edit"] });
  return payoutsService.syncStripeAccount(id(accountId, "Owner"));
}

// ── The daily run (Vercel cron) ─────────────────────────────────────────────

/** Pays direct deposit owners for charters that ended a day ago. Cron only. */
export async function runOwnerPayouts(
  authorization: string | null
): Promise<payoutsService.AutoPayoutRun> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (authorization !== `Bearer ${cronSecret}`) throw new AccessDenied("Unauthorized", 401);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("CRON_SECRET is not configured");
  }
  return payoutsService.payDueOwners();
}
