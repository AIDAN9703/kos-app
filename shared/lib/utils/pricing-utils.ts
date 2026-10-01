import { formatCurrency } from "./general-utils";

import { dollarsToCents, type Cents } from "./money-utils";
import { BoatWithTiers } from "@/features/boats/boat.types";
/**
 * Compute the lowest price-per-hour across active tiers for "from $X+/hr" display
 */
export function getBoatStartingHourlyRate(boat: BoatWithTiers): number {
  const activeTiers = boat.pricingTiers?.filter((tier) => tier.isActive) ?? [];
  if (activeTiers.length > 0) {
    const minPerHour = activeTiers.reduce((min, tier) => {
      const hours = Math.max(1, tier.hours || 0);
      const perHour = tier.price / hours;
      return perHour < min ? perHour : min;
    }, Infinity);
    return Number.isFinite(minPerHour) ? Math.max(0, Math.round(minPerHour)) : 0;
  }
  return 0;
}

/**
 * Convenience formatter for UI labels like "from $450+/hr"
 */
export function getBoatStartingHourlyLabel(boat: BoatWithTiers): string {
  const hourly = getBoatStartingHourlyRate(boat);
  return `${formatCurrency(hourly)}+/hour`;
}

// ========================================
// CENTS-BASED PRICING (NEW - Use for all database operations)
// All values in cents for precision
// ========================================

/**
 * Price breakdown in CENTS - for database storage and calculations
 * All monetary values are integers representing cents
 */
export interface BookingPriceBreakdownCents {
  basePriceCents: Cents;
  captainFeeCents: Cents;
  cleaningFeeCents: Cents;
  subtotalCents: Cents;
  serviceFeeCents: Cents;
  totalPriceCents: Cents;
}

/**
 * Calculate service fee in cents based on subtotal in cents.
 *
 * @param serviceFeeRate - Decimal rate (e.g. 0.035 for 3.5%), from app settings
 */
export const calculateServiceFeeCents = (
  subtotalCents: Cents,
  serviceFeeRate: number
): Cents => {
  return Math.round(subtotalCents * serviceFeeRate);
};

/**
 * MAIN booking price calculator in CENTS - use for all database operations
 *
 * Order: base (charter) + add-ons + cleaning + captain = subtotal, then the
 * service fee (rate from app settings) on subtotal = total.
 *
 * @param basePriceCents - Charter base price only (in cents)
 * @param cleaningFeeCents - One-time cleaning fee in cents
 * @param captainFeeCents - Captain service fee in cents
 * @param addOnsCents - Add-ons total in cents
 * @param serviceFeeRate - Decimal rate (e.g. 0.035), from getAppSettings() on
 *   the server or passed down as a prop on the client
 * @returns Complete price breakdown with all fees in cents
 */
export const calculateBookingPriceCents = (
  basePriceCents: Cents,
  cleaningFeeCents: Cents,
  captainFeeCents: Cents,
  addOnsCents: Cents,
  serviceFeeRate: number
): BookingPriceBreakdownCents => {
  const subtotalCents = basePriceCents + addOnsCents + captainFeeCents + cleaningFeeCents;
  const serviceFeeCents = calculateServiceFeeCents(subtotalCents, serviceFeeRate);
  const totalPriceCents = subtotalCents + serviceFeeCents;

  return {
    basePriceCents,
    captainFeeCents,
    cleaningFeeCents,
    subtotalCents,
    serviceFeeCents,
    totalPriceCents,
  };
};

/**
 * Calculate booking price from DOLLAR inputs, returns CENTS
 * Convenience function for when inputs come from forms/UI in dollars
 *
 * @param basePriceDollars - Base price from pricing tier (in dollars)
 * @param cleaningFeeDollars - One-time cleaning fee in dollars
 * @param captainFeeDollars - Captain service fee in dollars
 * @param serviceFeeRate - Decimal rate (e.g. 0.035), from app settings
 * @returns Complete price breakdown with all fees in cents
 */
export const calculateBookingPriceFromDollars = (
  basePriceDollars: number,
  cleaningFeeDollars: number,
  captainFeeDollars: number,
  serviceFeeRate: number
): BookingPriceBreakdownCents => {
  return calculateBookingPriceCents(
    dollarsToCents(basePriceDollars),
    dollarsToCents(cleaningFeeDollars),
    dollarsToCents(captainFeeDollars),
    0,
    serviceFeeRate
  );
};

// ========================================
// LEGACY DOLLAR-BASED PRICING (for backward compatibility)
// Will be deprecated - use cents versions above
// ========================================

// UNIVERSAL price breakdown interface - used everywhere
/** @deprecated Use BookingPriceBreakdownCents instead */
export interface BookingPriceBreakdown {
  basePrice: number;
  captainFee: number;
  cleaningFee: number;
  subtotal: number;
  serviceFee: number;
  totalPrice: number;
}

/**
 * Calculate service fee based on subtotal
 * @deprecated Use calculateServiceFeeCents instead
 */
export const calculateServiceFee = (
  subtotal: number,
  serviceFeeRate: number
): number => {
  return subtotal * serviceFeeRate;
};

/**
 * MAIN booking price calculator - single source of truth
 * Use this everywhere for consistent pricing
 *
 * @deprecated Use calculateBookingPriceCents instead
 *
 * @param pricingTierPrice - Base price from pricing tier
 * @param cleaningFee - One-time cleaning fee
 * @param captainFee - Captain service fee (usually 0 as included in base)
 * @param serviceFeeRate - Decimal rate (e.g. 0.035), from app settings
 * @returns Complete price breakdown with all fees
 */
export const calculateBookingPrice = (
  pricingTierPrice: number,
  cleaningFee: number,
  captainFee: number,
  serviceFeeRate: number
): BookingPriceBreakdown => {
  const basePrice = pricingTierPrice;
  const subtotal = basePrice + captainFee + cleaningFee;
  const serviceFee = calculateServiceFee(subtotal, serviceFeeRate);
  const totalPrice = subtotal + serviceFee;

  return {
    basePrice,
    captainFee,
    cleaningFee,
    subtotal,
    serviceFee,
    totalPrice,
  };
};
