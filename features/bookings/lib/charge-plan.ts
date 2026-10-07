/**
 * What a card payment charges — ONE place for the math, used by checkout,
 * the public proposal page, the customer's trip page and the admin
 * Breakdown, so every screen quotes the amount Stripe will actually take.
 *
 * The card fee (a percentage plus a fixed amount per booking) is charged on
 * EVERY card payment:
 *   deposit       = deposit + deposit × rate + the fixed fee
 *   pay in full   = the booking total (subtotal + its fee)
 *   balance       = total − already paid
 * The first payment carries the fixed fee; the balance carries the rest of
 * the percentage. Deposit + balance always equals the total, so the guest
 * never pays more than their proposal says.
 */

import { serviceFeeOn, type ServiceFee } from "@/shared/lib/utils/pricing-utils";

export type ChargeType = "deposit" | "full";

/** One boat's money as checkout sees it (a charter party has several). */
export interface ChargeableBoat {
  bookingId: string;
  /** Stored booking total in cents (subtotal + card fee). */
  totalCents: number;
  serviceFeeCents: number;
  /** The fee this booking was priced with (its snapshot). */
  serviceFee: ServiceFee;
  /** Settled off-card — no card payments are taken. */
  serviceFeeWaived: boolean;
  /** Deposit the admin set, BEFORE the card fee. Null = no deposit option. */
  depositCents: number | null;
  /** Card and off-card payments already received (refunds excluded). */
  paidCents: number;
}

interface ChargeLine {
  bookingId: string;
  /** What this boat's payment row records — base + fee. */
  amountCents: number;
  /** The part before the card fee (deposit or subtotal). */
  baseCents: number;
  /** The card fee inside amountCents; 0 when it can't be split (balance). */
  feeCents: number;
}

type PaymentKind = "DEPOSIT" | "FULL_PAYMENT" | "PARTIAL";

export interface ChargePlan {
  kind: PaymentKind;
  lines: ChargeLine[];
  amountCents: number;
  feeCents: number;
}

/** A deposit the guest may pay first: set, positive, below the subtotal. */
function validDepositCents(boat: ChargeableBoat): number | null {
  const subtotal = boat.totalCents - boat.serviceFeeCents;
  const deposit = boat.depositCents ?? 0;
  return deposit > 0 && deposit < subtotal ? deposit : null;
}

/** Deposit plus its card fee (the first payment, so the fixed part too). */
export function depositCharge(
  boat: ChargeableBoat
): { baseCents: number; feeCents: number; amountCents: number } | null {
  const base = validDepositCents(boat);
  if (base == null) return null;
  const fee = boat.serviceFeeWaived ? 0 : serviceFeeOn(base, boat.serviceFee);
  return { baseCents: base, feeCents: fee, amountCents: base + fee };
}

/**
 * Plan a card payment for a booking (or its whole charter party).
 *
 * - "deposit" is offered only before anything is paid, and only when at least
 *   one boat has a deposit set.
 * - "full" charges everything still owed: the full total when nothing is paid
 *   yet, otherwise the remaining balance.
 */
export function planCharge(
  boats: ChargeableBoat[],
  type: ChargeType
): { ok: true; plan: ChargePlan } | { ok: false; error: string } {
  if (boats.length === 0) return { ok: false, error: "Nothing to charge." };
  if (boats.some((b) => b.serviceFeeWaived)) {
    return {
      ok: false,
      error: "This booking is being settled off-card, so there's nothing to pay online.",
    };
  }
  const paidSoFar = boats.reduce((sum, b) => sum + b.paidCents, 0);

  if (type === "deposit") {
    if (paidSoFar > 0) return { ok: false, error: "The deposit has already been paid." };
    const lines: ChargeLine[] = [];
    for (const boat of boats) {
      const charge = depositCharge(boat);
      if (charge) lines.push({ bookingId: boat.bookingId, ...charge });
    }
    if (lines.length === 0)
      return { ok: false, error: "This booking doesn't have a deposit option." };
    return { ok: true, plan: summarize("DEPOSIT", lines) };
  }

  if (paidSoFar === 0) {
    const lines = boats
      .filter((b) => b.totalCents > 0)
      .map((b) => ({
        bookingId: b.bookingId,
        amountCents: b.totalCents,
        baseCents: b.totalCents - b.serviceFeeCents,
        feeCents: b.serviceFeeCents,
      }));
    if (lines.length === 0) return { ok: false, error: "This booking has no price yet." };
    return { ok: true, plan: summarize("FULL_PAYMENT", lines) };
  }

  const lines = boats
    .map((b) => ({ bookingId: b.bookingId, owed: Math.max(0, b.totalCents - b.paidCents) }))
    .filter((l) => l.owed > 0)
    .map((l) => ({ bookingId: l.bookingId, amountCents: l.owed, baseCents: l.owed, feeCents: 0 }));
  if (lines.length === 0) return { ok: false, error: "This booking is already paid in full." };
  return { ok: true, plan: summarize("PARTIAL", lines) };
}

function summarize(kind: PaymentKind, lines: ChargeLine[]): ChargePlan {
  return {
    kind,
    lines,
    amountCents: lines.reduce((sum, l) => sum + l.amountCents, 0),
    feeCents: lines.reduce((sum, l) => sum + l.feeCents, 0),
  };
}
