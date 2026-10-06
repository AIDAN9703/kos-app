import { formatCurrency } from "./general-utils";
import { type Cents } from "./money-utils";

/** Lowest price per hour across a boat's active tiers, for "from $450+/hour". */
export function startingHourlyRate(tiers: { hours: number; price: number }[]): number {
  const minPerHour = Math.min(...tiers.map((tier) => tier.price / Math.max(1, tier.hours)));
  return Number.isFinite(minPerHour) ? Math.max(0, Math.round(minPerHour)) : 0;
}

/** "$450+/hour" */
export function formatStartingHourly(rate: number): string {
  return `${formatCurrency(rate)}+/hour`;
}

// ========================================
// SERVICE (CARD PROCESSING) FEE
// ========================================

/**
 * The card processing fee: a percentage of every amount charged, plus a fixed
 * amount once per booking (collected with its first payment). Rates are basis
 * points (399 = 3.99%) so no float ever touches money.
 */
export interface ServiceFee {
  bps: number;
  fixedCents: Cents;
}

/**
 * The fee on an amount. Pass `withFixed: false` for a payment after the
 * first one (the fixed part was already collected).
 */
export function serviceFeeOn(
  amountCents: Cents,
  fee: ServiceFee,
  { withFixed = true }: { withFixed?: boolean } = {}
): Cents {
  if (amountCents <= 0) return 0;
  return Math.round((amountCents * fee.bps) / 10_000) + (withFixed ? fee.fixedCents : 0);
}

/**
 * The fee a booking was priced with, read from its pricing row. Rows priced
 * before the snapshot columns existed derive the rate from what was charged
 * (fee ÷ subtotal) and have no fixed part.
 */
export function serviceFeeFromSnapshot(pricing: {
  serviceFeeBps?: number | null;
  serviceFeeFixedCents?: number | null;
  serviceFeeCents?: number | null;
  totalAmountCents?: number | null;
}): ServiceFee {
  if (pricing.serviceFeeBps != null) {
    return { bps: pricing.serviceFeeBps, fixedCents: Number(pricing.serviceFeeFixedCents ?? 0) };
  }
  const fee = Number(pricing.serviceFeeCents ?? 0);
  const subtotal = Number(pricing.totalAmountCents ?? 0) - fee;
  return {
    bps: subtotal > 0 && fee > 0 ? Math.round((fee * 10_000) / subtotal) : 0,
    fixedCents: 0,
  };
}

/** 399 → "3.99%", 350 → "3.5%". */
export function formatBps(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`;
}

/** "3.99% + $0.99", or just "3.5%" when there's no fixed part. */
export function formatServiceFee(fee: ServiceFee): string {
  const percent = formatBps(fee.bps);
  return fee.fixedCents > 0
    ? `${percent} + ${formatCurrency(fee.fixedCents / 100, "USD", { showCents: true })}`
    : percent;
}

// ========================================
// BOOKING PRICE (CENTS)
// ========================================

export interface BookingPriceBreakdownCents {
  basePriceCents: Cents;
  captainFeeCents: Cents;
  cleaningFeeCents: Cents;
  subtotalCents: Cents;
  serviceFeeCents: Cents;
  totalPriceCents: Cents;
}

/**
 * THE booking price calculator, used by every server path and every price
 * preview: base + add-ons + cleaning + captain = subtotal, then the service
 * fee on the subtotal = total (what the guest pays in one payment).
 */
export function calculateBookingPriceCents(
  basePriceCents: Cents,
  cleaningFeeCents: Cents,
  captainFeeCents: Cents,
  addOnsCents: Cents,
  fee: ServiceFee
): BookingPriceBreakdownCents {
  const subtotalCents = basePriceCents + addOnsCents + captainFeeCents + cleaningFeeCents;
  const serviceFeeCents = serviceFeeOn(subtotalCents, fee);
  return {
    basePriceCents,
    captainFeeCents,
    cleaningFeeCents,
    subtotalCents,
    serviceFeeCents,
    totalPriceCents: subtotalCents + serviceFeeCents,
  };
}
