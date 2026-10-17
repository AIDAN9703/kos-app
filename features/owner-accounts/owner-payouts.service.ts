import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/database/db";
import {
  boats,
  bookingExpenseLines,
  bookingPricing,
  bookings,
  ownerAccountMembers,
  ownerAccounts,
  ownerPayouts,
  users,
} from "@/database/schema";
import { bookingOpsService } from "@/features/bookings/services/booking-ops.service";
import { UserFacingError, pgErrorCode } from "@/shared/lib/errors";
import { sendAccountEmail, sendAdminAlertEmail } from "@/shared/lib/services/email.service";
import { getStripe } from "@/shared/lib/services/stripe.service";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { AUTO_PAYOUT_DELAY_HOURS, zelleLabel } from "./owner-accounts.constants";
import { payoutSetupFrom } from "./owner-accounts.service";
import type {
  OwnerPayoutSetup,
  OwnerPayouts,
  PayoutLine,
  PayoutRecord,
} from "./owner-accounts.types";

/**
 * Paying owners. Guests pay KOS (Stripe Checkout, as always); KOS then pays
 * each owner for a charter once the trip is over. Direct deposit owners (a
 * Stripe Connect Express account they set up on Stripe's site) are paid by
 * a daily run, a day after the trip; Zelle owners by the team, who record
 * it. Every payout is an owner_payout row; booking_ops.sent_to_owner_cents
 * follows the PAID ones, and the owner gets an email for each. Not
 * access-checked here: callers go through owner-payouts.data.ts.
 */

// ── Direct deposit (Stripe Connect Express) ─────────────────────────────────

async function accountRow(accountId: string) {
  const [row] = await db
    .select({
      id: ownerAccounts.id,
      name: ownerAccounts.name,
      kind: ownerAccounts.kind,
      contactEmail: ownerAccounts.contactEmail,
      payoutMethod: ownerAccounts.payoutMethod,
      zelleContact: ownerAccounts.zelleContact,
      stripeAccountId: ownerAccounts.stripeAccountId,
      stripePayoutsEnabled: ownerAccounts.stripePayoutsEnabled,
      stripeBankLast4: ownerAccounts.stripeBankLast4,
    })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.id, accountId));
  if (!row) throw new UserFacingError("Owner not found", 404);
  return row;
}

/** The owner's Stripe account, created the first time they set up direct deposit. */
async function ensureStripeAccount(accountId: string, email: string): Promise<string> {
  const owner = await accountRow(accountId);
  if (owner.stripeAccountId) return owner.stripeAccountId;

  const account = await getStripe().accounts.create(
    {
      type: "express",
      country: "US",
      email: owner.contactEmail ?? email,
      business_type: owner.kind === "BUSINESS" ? "company" : "individual",
      // KOS charges guests and sends owners their share: transfers only.
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: "Boat charters booked through KOS Yachts" },
      metadata: { owner_account_id: accountId },
    },
    { idempotencyKey: `owner-account-${accountId}` }
  );
  // Only the first one sticks if two requests raced.
  await db
    .update(ownerAccounts)
    .set({ stripeAccountId: account.id, updatedAt: new Date() })
    .where(and(eq(ownerAccounts.id, accountId), isNull(ownerAccounts.stripeAccountId)));
  return (await accountRow(accountId)).stripeAccountId ?? account.id;
}

/** A one-time Stripe link where the owner enters their details and bank account. */
export async function stripeOnboardingLink(
  accountId: string,
  email: string,
  baseUrl: string
): Promise<string> {
  const stripeAccountId = await ensureStripeAccount(accountId, email);
  const link = await getStripe().accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${baseUrl}/owner/earnings?stripe=refresh`,
    return_url: `${baseUrl}/owner/earnings?stripe=return`,
  });
  return link.url;
}

function bankLast4(account: Stripe.Account): string | null {
  const external = account.external_accounts?.data?.[0];
  return external && "last4" in external ? (external.last4 ?? null) : null;
}

/**
 * Reads where the owner's Stripe setup stands and saves it. A finished setup
 * becomes their payout method unless they chose Zelle.
 */
export async function syncStripeAccount(accountId: string): Promise<OwnerPayoutSetup> {
  const owner = await accountRow(accountId);
  if (!owner.stripeAccountId) return payoutSetupFrom(owner);
  const account = await getStripe().accounts.retrieve(owner.stripeAccountId);
  const ready = Boolean(account.payouts_enabled) && account.capabilities?.transfers === "active";
  await db
    .update(ownerAccounts)
    .set({
      stripePayoutsEnabled: ready,
      stripeBankLast4: bankLast4(account),
      payoutMethod: ready && !owner.payoutMethod ? "STRIPE" : owner.payoutMethod,
      updatedAt: new Date(),
    })
    .where(eq(ownerAccounts.id, accountId));
  return payoutSetupFrom(await accountRow(accountId));
}

/** A sign-in link to the owner's own Stripe dashboard (payout schedule, bank, tax forms). */
export async function stripeDashboardLink(accountId: string): Promise<string> {
  const owner = await accountRow(accountId);
  if (!owner.stripeAccountId) throw new UserFacingError("Direct deposit isn't set up yet.");
  return (await getStripe().accounts.createLoginLink(owner.stripeAccountId)).url;
}

export async function saveZelle(accountId: string, zelleContact: string | null): Promise<void> {
  const owner = await accountRow(accountId);
  await db
    .update(ownerAccounts)
    .set({
      zelleContact,
      // Without a Zelle contact, Zelle can't be how they're paid.
      payoutMethod: zelleContact
        ? (owner.payoutMethod ?? "ZELLE")
        : owner.payoutMethod === "ZELLE"
          ? owner.stripePayoutsEnabled
            ? "STRIPE"
            : null
          : owner.payoutMethod,
      updatedAt: new Date(),
    })
    .where(eq(ownerAccounts.id, accountId));
}

export async function choosePayoutMethod(
  accountId: string,
  method: "STRIPE" | "ZELLE"
): Promise<void> {
  const owner = await accountRow(accountId);
  if (method === "STRIPE" && !owner.stripePayoutsEnabled) {
    throw new UserFacingError("Finish setting up direct deposit first.");
  }
  if (method === "ZELLE" && !owner.zelleContact) {
    throw new UserFacingError("Add the email or phone your Zelle uses first.");
  }
  await db
    .update(ownerAccounts)
    .set({ payoutMethod: method, updatedAt: new Date() })
    .where(eq(ownerAccounts.id, accountId));
}

// ── What's owed and what's paid ─────────────────────────────────────────────

/** Each charter's owner payout: its OWNER_PAYOUT lines. */
const owedByBooking = db
  .select({
    bookingId: bookingExpenseLines.bookingId,
    owedCents: sql<string>`sum(${bookingExpenseLines.amountCents})`.as("owed_cents"),
  })
  .from(bookingExpenseLines)
  .where(eq(bookingExpenseLines.category, "OWNER_PAYOUT"))
  .groupBy(bookingExpenseLines.bookingId)
  .as("owed");

/** What's been sent per charter, paid and still with Stripe. */
const paidByBooking = db
  .select({
    bookingId: ownerPayouts.bookingId,
    paidCents:
      sql<string>`sum(${ownerPayouts.amountCents}) filter (where ${ownerPayouts.status} = 'PAID')`.as(
        "paid_cents"
      ),
    pendingCents:
      sql<string>`sum(${ownerPayouts.amountCents}) filter (where ${ownerPayouts.status} = 'PENDING')`.as(
        "pending_cents"
      ),
  })
  .from(ownerPayouts)
  .groupBy(ownerPayouts.bookingId)
  .as("sent");

async function payoutLines(
  accountIds: string[],
  bookingId?: string
): Promise<(PayoutLine & { ownerAccountId: string })[]> {
  if (accountIds.length === 0) return [];
  const rows = await db
    .select({
      bookingId: bookings.id,
      ownerAccountId: bookings.ownerAccountId,
      boatName: boats.name,
      boatTitle: boats.displayTitle,
      timezone: boats.timezone,
      startsAt: bookings.startDateTime,
      endsAt: bookings.endDateTime,
      currency: bookingPricing.currency,
      owedCents: owedByBooking.owedCents,
      paidCents: paidByBooking.paidCents,
      pendingCents: paidByBooking.pendingCents,
    })
    .from(bookings)
    .innerJoin(boats, eq(boats.id, bookings.boatId))
    .innerJoin(owedByBooking, eq(owedByBooking.bookingId, bookings.id))
    .leftJoin(paidByBooking, eq(paidByBooking.bookingId, bookings.id))
    .leftJoin(bookingPricing, eq(bookingPricing.bookingId, bookings.id))
    .where(
      and(
        inArray(bookings.ownerAccountId, accountIds),
        inArray(bookings.bookingStatus, ["BOOKED", "COMPLETED"]),
        sql`${bookings.startDateTime} is not null`,
        bookingId ? eq(bookings.id, bookingId) : undefined
      )
    )
    .orderBy(bookings.startDateTime);
  const now = Date.now();
  return rows.map((r) => {
    const startsAt = r.startsAt as Date;
    const over = (r.endsAt ?? startsAt).getTime() < now;
    return {
      bookingId: r.bookingId,
      ownerAccountId: r.ownerAccountId as string,
      boatName: r.boatTitle || r.boatName,
      startsAt,
      endsAt: r.endsAt,
      timezone: r.timezone,
      currency: r.currency ?? "USD",
      owedCents: Number(r.owedCents ?? 0),
      paidCents: Number(r.paidCents ?? 0),
      pendingCents: Number(r.pendingCents ?? 0),
      payable: over,
    };
  });
}

const leftToPay = (l: PayoutLine) => l.owedCents - l.paidCents - l.pendingCents;

export async function listPayouts(accountId: string): Promise<OwnerPayouts> {
  const [lines, history] = await Promise.all([
    payoutLines([accountId]),
    db
      .select({
        id: ownerPayouts.id,
        bookingId: ownerPayouts.bookingId,
        boatName: boats.name,
        boatTitle: boats.displayTitle,
        tripDate: bookings.startDateTime,
        amountCents: ownerPayouts.amountCents,
        currency: ownerPayouts.currency,
        method: ownerPayouts.method,
        status: ownerPayouts.status,
        reference: ownerPayouts.reference,
        failureReason: ownerPayouts.failureReason,
        paidAt: ownerPayouts.paidAt,
        createdAt: ownerPayouts.createdAt,
      })
      .from(ownerPayouts)
      .innerJoin(bookings, eq(bookings.id, ownerPayouts.bookingId))
      .leftJoin(boats, eq(boats.id, bookings.boatId))
      .where(eq(ownerPayouts.ownerAccountId, accountId))
      .orderBy(desc(ownerPayouts.createdAt))
      .limit(100),
  ]);
  return {
    due: lines.filter((l) => l.payable && leftToPay(l) > 0),
    upcoming: lines.filter((l) => !l.payable),
    history: history.map(
      ({ boatName, boatTitle, ...h }): PayoutRecord => ({
        ...h,
        boatName: boatTitle || boatName || "Boat",
      })
    ),
  };
}

/** Owed now (trip over, not yet paid) per owner, for the owners list. */
export async function owedNowByAccount(): Promise<Map<string, number>> {
  const accounts = await db.select({ id: ownerAccounts.id }).from(ownerAccounts);
  const lines = await payoutLines(accounts.map((a) => a.id));
  const owed = new Map<string, number>();
  for (const line of lines) {
    const left = leftToPay(line);
    if (line.payable && left > 0) {
      owed.set(line.ownerAccountId, (owed.get(line.ownerAccountId) ?? 0) + left);
    }
  }
  return owed;
}

/** Keeps the booking's ops "sent to owner" equal to its PAID payouts. */
async function syncSentToOwner(bookingId: string): Promise<void> {
  const [row] = await db
    .select({
      paid: sql<string>`coalesce(sum(${ownerPayouts.amountCents}) filter (where ${ownerPayouts.status} = 'PAID'), 0)`,
    })
    .from(ownerPayouts)
    .where(eq(ownerPayouts.bookingId, bookingId));
  await bookingOpsService.upsert(bookingId, { sentToOwnerCents: Number(row?.paid ?? 0) });
}

async function payableLine(accountId: string, bookingId: string) {
  const [line] = await payoutLines([accountId], bookingId);
  if (!line)
    throw new UserFacingError("That charter isn't this owner's, or has no owner payout.", 404);
  if (!line.payable) throw new UserFacingError("Owners are paid once the trip is over.");
  const left = leftToPay(line);
  if (left <= 0) throw new UserFacingError("This charter is already paid.", 409);
  return { line, left };
}

const stripeCode = (error: unknown) =>
  typeof error === "object" && error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;

/** Why a transfer didn't go, in words the team can act on. */
function transferFailure(error: unknown): string {
  switch (stripeCode(error)) {
    case "insufficient_capabilities_for_transfer":
      return "Their direct deposit isn't ready on Stripe's side yet. Ask them to finish setting it up, or pay by Zelle.";
    case "balance_insufficient":
      return "KOS's Stripe balance doesn't have enough available yet. Card payments take a few days to become available; try again then, or pay by Zelle.";
    default:
      return error instanceof Error ? error.message : "Stripe didn't say why.";
  }
}

/** The transfer Stripe made for this payout row, if it made one. */
async function madeTransferId(bookingId: string, payoutId: string): Promise<string | null> {
  const { data } = await getStripe().transfers.list({
    transfer_group: `booking_${bookingId}`,
    limit: 20,
  });
  return data.find((t) => t.metadata?.owner_payout_id === payoutId)?.id ?? null;
}

/**
 * Sends what's left on a charter to the owner's direct deposit account. The
 * row is written first (PENDING), so a second click can't send it twice,
 * and Stripe gets an idempotency key per row.
 */
export async function payWithStripe(
  accountId: string,
  bookingId: string,
  userId: string | null
): Promise<number> {
  const owner = await accountRow(accountId);
  if (!owner.stripeAccountId || !owner.stripePayoutsEnabled) {
    throw new UserFacingError("This owner hasn't finished setting up direct deposit.");
  }
  const { line, left } = await payableLine(accountId, bookingId);
  if (line.currency.toUpperCase() !== "USD") {
    throw new UserFacingError("Direct deposit pays in US dollars. Pay this charter by Zelle.");
  }

  let payoutId: string;
  try {
    const [row] = await db
      .insert(ownerPayouts)
      .values({
        ownerAccountId: accountId,
        bookingId,
        amountCents: left,
        currency: "USD",
        method: "STRIPE",
        status: "PENDING",
        createdByUserId: userId,
      })
      .returning({ id: ownerPayouts.id });
    payoutId = row.id;
  } catch (error) {
    if (pgErrorCode(error) === "23505") {
      throw new UserFacingError("A payout for this charter is already on its way.", 409);
    }
    throw error;
  }

  let transferId: string | null = null;
  let failure = "";
  let failureCode: string | undefined;
  try {
    const transfer = await getStripe().transfers.create(
      {
        amount: left,
        currency: "usd",
        destination: owner.stripeAccountId,
        transfer_group: `booking_${bookingId}`,
        description: `${line.boatName}, ${formatBoatLocal(line.startsAt, line.timezone, "MMM d, yyyy")}`,
        metadata: { booking_id: bookingId, owner_account_id: accountId, owner_payout_id: payoutId },
      },
      { idempotencyKey: `owner-payout-${payoutId}` }
    );
    transferId = transfer.id;
  } catch (error) {
    failure = transferFailure(error);
    failureCode = stripeCode(error);
    // A dropped connection can hide a transfer Stripe did make: look before calling it failed.
    transferId = await madeTransferId(bookingId, payoutId).catch(() => null);
  }
  await db
    .update(ownerPayouts)
    .set(
      transferId
        ? {
            status: "PAID",
            stripeTransferId: transferId,
            paidAt: new Date(),
            updatedAt: new Date(),
          }
        : { status: "FAILED", failureReason: failure, updatedAt: new Date() }
    )
    .where(eq(ownerPayouts.id, payoutId));
  await syncSentToOwner(bookingId);
  if (!transferId) {
    // Stripe says their account can't take money: refresh it so Pay stops showing.
    if (failureCode === "insufficient_capabilities_for_transfer") {
      await syncStripeAccount(accountId).catch(() => undefined);
    }
    throw new UserFacingError(`Stripe didn't send it. ${failure}`);
  }
  await emailOwnerPaid(payoutId);
  return left;
}

/** Records a Zelle payment the team made for a charter. */
export async function recordZellePayout(
  accountId: string,
  params: {
    bookingId: string;
    amountCents: number;
    paidOn: Date;
    reference: string | null;
    /** Email the owner (off when catching up on payments made before). */
    notifyOwner: boolean;
  },
  userId: string
): Promise<void> {
  const { left } = await payableLine(accountId, params.bookingId);
  if (params.amountCents > left) {
    throw new UserFacingError(`That's more than is left to pay ($${(left / 100).toFixed(2)}).`);
  }
  const [row] = await db
    .insert(ownerPayouts)
    .values({
      ownerAccountId: accountId,
      bookingId: params.bookingId,
      amountCents: params.amountCents,
      method: "ZELLE",
      status: "PAID",
      reference: params.reference,
      paidAt: params.paidOn,
      createdByUserId: userId,
    })
    .returning({ id: ownerPayouts.id });
  await syncSentToOwner(params.bookingId);
  if (params.notifyOwner) await emailOwnerPaid(row.id);
}

/** Takes back a Zelle payout recorded by mistake. Stripe payouts stay: they really went out. */
export async function removeZellePayout(accountId: string, payoutId: string): Promise<void> {
  const [removed] = await db
    .delete(ownerPayouts)
    .where(
      and(
        eq(ownerPayouts.id, payoutId),
        eq(ownerPayouts.ownerAccountId, accountId),
        eq(ownerPayouts.method, "ZELLE")
      )
    )
    .returning({ bookingId: ownerPayouts.bookingId });
  if (!removed) throw new UserFacingError("Only a recorded Zelle payout can be removed.", 404);
  await syncSentToOwner(removed.bookingId);
}

// ── The daily run ───────────────────────────────────────────────────────────

/** Owners the daily run pays: direct deposit chosen and ready on Stripe. */
function directDepositAccounts() {
  return db
    .select({ id: ownerAccounts.id, name: ownerAccounts.name })
    .from(ownerAccounts)
    .where(
      and(
        eq(ownerAccounts.payoutMethod, "STRIPE"),
        eq(ownerAccounts.stripePayoutsEnabled, true),
        isNotNull(ownerAccounts.stripeAccountId),
        eq(ownerAccounts.isHouse, false)
      )
    );
}

/**
 * What the daily run will send from KOS's Stripe balance: owed now on
 * charters that are over, and on charters ending in the next `days`. KOS
 * keeps this much in Stripe when it pays itself out by hand.
 */
export async function directDepositOutlook(
  days = 14,
  now = new Date()
): Promise<{ dueNowCents: number; comingCents: number }> {
  const ready = await directDepositAccounts();
  const lines = await payoutLines(ready.map((a) => a.id));
  const horizon = now.getTime() + days * 864e5;
  let dueNowCents = 0;
  let comingCents = 0;
  for (const line of lines) {
    const left = leftToPay(line);
    if (left <= 0 || line.currency.toUpperCase() !== "USD") continue;
    const end = (line.endsAt ?? line.startsAt).getTime();
    if (end <= now.getTime()) dueNowCents += left;
    else if (end <= horizon) comingCents += left;
  }
  return { dueNowCents, comingCents };
}

export type AutoPayoutRun = { paid: number; paidCents: number; waiting: number; failed: number };

/**
 * Pays every direct deposit owner for charters that ended at least
 * AUTO_PAYOUT_DELAY_HOURS ago, oldest trip first. A payout that KOS's
 * available Stripe balance can't cover yet waits for the next run (card
 * payments take a few days to become available); the team hears about
 * anything that waited or failed.
 */
export async function payDueOwners(now = new Date()): Promise<AutoPayoutRun> {
  const ready = await directDepositAccounts();
  const cutoff = now.getTime() - AUTO_PAYOUT_DELAY_HOURS * 36e5;
  const due = (await payoutLines(ready.map((a) => a.id))).filter(
    (l) =>
      (l.endsAt ?? l.startsAt).getTime() <= cutoff &&
      l.pendingCents === 0 &&
      leftToPay(l) > 0 &&
      l.currency.toUpperCase() === "USD"
  );
  const run: AutoPayoutRun = { paid: 0, paidCents: 0, waiting: 0, failed: 0 };
  if (due.length === 0) return run;

  const balance = await getStripe().balance.retrieve();
  let available = balance.available
    .filter((b) => b.currency === "usd")
    .reduce((sum, b) => sum + b.amount, 0);
  const problems: { line: (typeof due)[number]; why: string }[] = [];

  for (const line of due) {
    const left = leftToPay(line);
    if (left > available) {
      run.waiting += 1;
      problems.push({ line, why: "Waiting for KOS's Stripe balance to cover it" });
      continue;
    }
    try {
      const sent = await payWithStripe(line.ownerAccountId, line.bookingId, null);
      available -= sent;
      run.paid += 1;
      run.paidCents += sent;
    } catch (error) {
      run.failed += 1;
      problems.push({
        line,
        why: error instanceof Error ? error.message : "Stripe didn't send it.",
      });
    }
  }

  if (problems.length > 0) {
    const names = new Map(ready.map((a) => [a.id, a.name]));
    await alertTeamQuietly({
      subject: `${problems.length} owner ${problems.length === 1 ? "payout" : "payouts"} didn't go out`,
      heading: "Owner payouts need a look",
      lines: problems.map(({ line, why }) => ({
        label: names.get(line.ownerAccountId) ?? "Owner",
        value: `${money(leftToPay(line), line.currency)} · ${line.boatName}, ${tripDay(line)}\n${why}`,
      })),
      bookingId: problems[0].line.bookingId,
      note: "Each one is tried again on tomorrow's run. Failures show on the owner's page under Payouts.",
    });
  }
  return run;
}

// ── Stripe's news about connected accounts (webhook) ────────────────────────

/** account.updated: re-read the owner's setup from Stripe. */
export async function syncByStripeAccount(stripeAccountId: string): Promise<void> {
  const [owner] = await db
    .select({ id: ownerAccounts.id })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.stripeAccountId, stripeAccountId));
  if (!owner) {
    console.warn(`[Connect] ${stripeAccountId} isn't an owner's account; ignored`);
    return;
  }
  await syncStripeAccount(owner.id);
}

/** account.application.deauthorized: KOS can't pay into it any more. */
export async function disconnectStripeAccount(stripeAccountId: string): Promise<void> {
  await db
    .update(ownerAccounts)
    .set({ stripePayoutsEnabled: false, updatedAt: new Date() })
    .where(eq(ownerAccounts.stripeAccountId, stripeAccountId));
}

/** payout.failed: Stripe couldn't move an owner's money on to their bank. */
export async function alertBankPayoutFailed(
  stripeAccountId: string,
  payout: Stripe.Payout
): Promise<void> {
  const [owner] = await db
    .select({ name: ownerAccounts.name })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.stripeAccountId, stripeAccountId));
  await alertTeamQuietly({
    subject: `Stripe couldn't deposit an owner's payout${owner ? `: ${owner.name}` : ""}`,
    heading: "An owner's bank deposit failed",
    lines: [
      { label: "Owner", value: owner?.name ?? stripeAccountId },
      { label: "Amount", value: money(payout.amount, payout.currency.toUpperCase()) },
      { label: "Why", value: payout.failure_message ?? payout.failure_code ?? null },
    ],
    note: "The money is back in their Stripe balance. Ask them to check their bank details in their Stripe dashboard (Earnings → Stripe dashboard); Stripe retries once they fix it.",
  });
}

// ── Telling people ──────────────────────────────────────────────────────────

const money = (cents: number, currency = "USD") => formatCentsAsCurrency(cents, { currency });
const tripDay = (l: { startsAt: Date; timezone: string | null }) =>
  formatBoatLocal(l.startsAt, l.timezone, "EEE, MMM d");

/** Off the production deployment, mail goes only to Resend's test inboxes. */
const mailIsLive = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";
const mayEmail = (to: string) => mailIsLive || to.toLowerCase().endsWith("@resend.dev");

async function alertTeamQuietly(params: Parameters<typeof sendAdminAlertEmail>[0]) {
  if (!mailIsLive) {
    console.info(`[dev] Team alert not sent: ${params.subject}`, params.lines);
    return;
  }
  await sendAdminAlertEmail(params);
}

/** The account's Owners (Managers don't see money), else its contact email. */
async function ownerRecipients(
  accountId: string
): Promise<{ email: string; name: string | null }[]> {
  const owners = await db
    .select({ email: users.email, name: users.firstName })
    .from(ownerAccountMembers)
    .innerJoin(users, eq(users.id, ownerAccountMembers.userId))
    .where(
      and(eq(ownerAccountMembers.ownerAccountId, accountId), eq(ownerAccountMembers.role, "OWNER"))
    );
  if (owners.length > 0) return owners;
  const [account] = await db
    .select({ email: ownerAccounts.contactEmail })
    .from(ownerAccounts)
    .where(eq(ownerAccounts.id, accountId));
  return account?.email ? [{ email: account.email, name: null }] : [];
}

/** Emails the owner that a payout went out. Never throws: the payout already happened. */
async function emailOwnerPaid(payoutId: string): Promise<void> {
  try {
    const [p] = await db
      .select({
        accountId: ownerPayouts.ownerAccountId,
        amountCents: ownerPayouts.amountCents,
        currency: ownerPayouts.currency,
        method: ownerPayouts.method,
        boatName: boats.name,
        boatTitle: boats.displayTitle,
        timezone: boats.timezone,
        startsAt: bookings.startDateTime,
        zelleContact: ownerAccounts.zelleContact,
        bankLast4: ownerAccounts.stripeBankLast4,
      })
      .from(ownerPayouts)
      .innerJoin(bookings, eq(bookings.id, ownerPayouts.bookingId))
      .innerJoin(boats, eq(boats.id, bookings.boatId))
      .innerJoin(ownerAccounts, eq(ownerAccounts.id, ownerPayouts.ownerAccountId))
      .where(eq(ownerPayouts.id, payoutId));
    if (!p?.startsAt) return;
    const amount = money(p.amountCents, p.currency);
    const trip = `${p.boatTitle || p.boatName}, ${tripDay({ startsAt: p.startsAt, timezone: p.timezone })}`;
    const how =
      p.method === "STRIPE"
        ? p.bankLast4
          ? `by direct deposit to your bank ending in ${p.bankLast4}`
          : "by direct deposit"
        : p.zelleContact
          ? `by Zelle to ${zelleLabel(p.zelleContact)}`
          : "by Zelle";

    for (const to of await ownerRecipients(p.accountId)) {
      if (!mayEmail(to.email)) {
        console.info(`[dev] Payout email to ${to.email} not sent: ${amount} for ${trip}`);
        continue;
      }
      await sendAccountEmail({
        to: to.email,
        name: to.name,
        subject: `KOS sent you ${amount}`,
        previewText: `For ${trip}.`,
        lead: `KOS sent you ${amount} for ${trip}, ${how}.`,
        buttonLabel: "See your earnings",
        url: `${getBaseUrl()}/owner/earnings`,
        footnote:
          p.method === "STRIPE"
            ? "Stripe moves it on to your bank on your payout schedule; your Stripe dashboard (from Earnings) shows when it lands. Questions? Call or text (305) 521-8877."
            : "Zelle usually arrives within minutes. Don't see it? Call or text (305) 521-8877.",
      });
    }
  } catch (error) {
    console.error("[Payouts] Owner payout email failed:", error);
  }
}
