/**
 * What a card payment charges — ONE place for the math, used by checkout,
 * the public proposal page, the customer's trip page and the admin
 * Breakdown, so every screen quotes the amount Stripe will actually take.
 *
 * The card processing fee is charged on EVERY card payment, in proportion:
 *   deposit       = deposit + (deposit × fee rate)
 *   pay in full   = the booking total (subtotal + fee)
 *   balance       = total − already paid
 * Because the deposit carried its share of the fee, the balance carries the
 * rest — deposit + balance always equals the total, and KOS never absorbs
 * Stripe's processing cost on a deposit.
 */

export type ChargeType = "deposit" | "full";

/** One boat's money as checkout sees it (a charter party has several). */
export interface ChargeableBoat {
  bookingId: string;
  /** Stored booking total in cents (subtotal + card fee). */
  totalCents: number;
  serviceFeeCents: number;
  /** Settled off-card — no card payments are taken. */
  serviceFeeWaived: boolean;
  /** Deposit the admin set, BEFORE the card fee. Null = no deposit option. */
  depositCents: number | null;
  /** Card and off-card payments already received (refunds excluded). */
  paidCents: number;
}

export interface ChargeLine {
  bookingId: string;
  /** What this boat's payment row records — base + fee. */
  amountCents: number;
  /** The part before the card fee (deposit or subtotal). */
  baseCents: number;
  /** The card fee inside amountCents; 0 when it can't be split (balance). */
  feeCents: number;
}

export type PaymentKind = "DEPOSIT" | "FULL_PAYMENT" | "PARTIAL";

export interface ChargePlan {
  kind: PaymentKind;
  lines: ChargeLine[];
  amountCents: number;
  feeCents: number;
}

/** The fee rate this booking was priced at (fee ÷ subtotal); 0 when waived. */
export function feeRateOf(
  boat: Pick<ChargeableBoat, "totalCents" | "serviceFeeCents" | "serviceFeeWaived">
): number {
  if (boat.serviceFeeWaived) return 0;
  const subtotal = boat.totalCents - boat.serviceFeeCents;
  return subtotal > 0 && boat.serviceFeeCents > 0 ? boat.serviceFeeCents / subtotal : 0;
}

/** A deposit the guest may pay first: set, positive, below the subtotal. */
export function validDepositCents(boat: ChargeableBoat): number | null {
  const subtotal = boat.totalCents - boat.serviceFeeCents;
  const deposit = boat.depositCents ?? 0;
  return deposit > 0 && deposit < subtotal ? deposit : null;
}

/** Deposit plus its share of the card fee. */
export function depositCharge(
  boat: ChargeableBoat
): { baseCents: number; feeCents: number; amountCents: number } | null {
  const base = validDepositCents(boat);
  if (base == null) return null;
  const fee = Math.round(base * feeRateOf(boat));
  return { baseCents: base, feeCents: fee, amountCents: base + fee };
}

export function remainingCents(boats: ChargeableBoat[]): number {
  return boats.reduce((sum, b) => sum + Math.max(0, b.totalCents - b.paidCents), 0);
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

/** "3.5%" from a rate, for labels. */
export function formatFeeRate(rate: number): string {
  return `${Number((rate * 100).toFixed(2))}%`;
}
