import "server-only";

/**
 * Booking Pricing Service
 * 
 * Business logic layer for booking pricing.
 * Uses direct database access (no repository layer).
 * 
 * All monetary values are in CENTS. The service fee (rate + fixed) comes from
 * app settings and is snapshotted onto each booking's pricing row — settings
 * changes never alter existing bookings.
 */

import { db } from '@/database/db';
import { bookingPricing } from '@/database/schema';
import { eq } from 'drizzle-orm';
import type { BookingPricing } from '@/database/types';
import type { Cents } from '@/shared/lib/utils/money-utils';
import { calculateBookingPriceCents, type ServiceFee } from '@/shared/lib/utils/pricing-utils';
import { getAppSettings } from '@/features/app-settings/app-settings.service';

// ============================================================================
// TYPES
// ============================================================================

interface CreateBookingPricingInput {
  bookingId: string;
  basePriceCents: Cents;
  captainFeeCents?: Cents | null;
  cleaningFeeCents?: Cents | null;
  serviceFeeCents?: Cents | null;
  /** The fee it was priced with — required so the snapshot is never missing. */
  serviceFee: ServiceFee;
  taxAmountCents?: Cents | null;
  discountAmountCents?: Cents | null;
  discountCode?: string | null;
  depositAmountCents?: Cents | null;
  totalAmountCents: Cents;
  currency?: string;
  depositDueDate?: Date | null;
  remainderDueDate?: Date | null;
}

interface UpdateBookingPricingInput {
  basePriceCents?: Cents;
  captainFeeCents?: Cents | null;
  cleaningFeeCents?: Cents | null;
  serviceFeeCents?: Cents | null;
  serviceFeeBps?: number;
  serviceFeeFixedCents?: Cents;
  taxAmountCents?: Cents | null;
  discountAmountCents?: Cents | null;
  discountCode?: string | null;
  depositAmountCents?: Cents | null;
  totalAmountCents?: Cents;
  /** Paid off-card: the card fee drops out of what the customer owes. */
  serviceFeeWaived?: boolean;
  depositDueDate?: Date | null;
  remainderDueDate?: Date | null;
}

/**
 * Simple pricing input for creating from base values
 * Service will calculate fees automatically.
 * Subtotal = base + add-ons + cleaning + captain; the service fee (from settings) applies on top.
 */
interface SimplePricingInput {
  basePriceCents: Cents;
  addOnsCents?: Cents;
  captainFeeCents?: Cents;
  cleaningFeeCents?: Cents;
  taxAmountCents?: Cents;
  discountAmountCents?: Cents;
  discountCode?: string | null;
  depositAmountCents?: Cents | null;
  currency?: string;
  depositDueDate?: Date | null;
  remainderDueDate?: Date | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class BookingPricingService {
  /**
   * Create pricing record for a booking
   */
  async createPricing(input: CreateBookingPricingInput): Promise<BookingPricing> {
    const [created] = await db
      .insert(bookingPricing)
      .values({
        bookingId: input.bookingId,
        basePriceCents: input.basePriceCents,
        captainFeeCents: input.captainFeeCents ?? null,
        cleaningFeeCents: input.cleaningFeeCents ?? null,
        serviceFeeCents: input.serviceFeeCents ?? null,
        serviceFeeBps: input.serviceFee.bps,
        serviceFeeFixedCents: input.serviceFee.fixedCents,
        taxAmountCents: input.taxAmountCents ?? null,
        discountAmountCents: input.discountAmountCents ?? null,
        discountCode: input.discountCode ?? null,
        depositAmountCents: input.depositAmountCents ?? null,
        totalAmountCents: input.totalAmountCents,
        currency: input.currency ?? 'USD',
        depositDueDate: input.depositDueDate ?? null,
        remainderDueDate: input.remainderDueDate ?? null,
      })
      .returning();
    
    return created;
  }

  /**
   * Create pricing from simple input - calculates service fee and total automatically
   */
  async createPricingWithCalculation(
    bookingId: string,
    input: SimplePricingInput
  ): Promise<BookingPricing> {
    // Calculate fees: subtotal = base + add-ons + cleaning + captain; service fee on subtotal
    const { serviceFee } = await getAppSettings();
    const breakdown = calculateBookingPriceCents(
      input.basePriceCents,
      input.cleaningFeeCents ?? 0,
      input.captainFeeCents ?? 0,
      input.addOnsCents ?? 0,
      serviceFee
    );

    // Apply tax and discount after service fee calculation
    const taxCents = input.taxAmountCents ?? 0;
    const discountCents = input.discountAmountCents ?? 0;
    const finalTotalCents = breakdown.totalPriceCents + taxCents - discountCents;

    return this.createPricing({
      bookingId,
      basePriceCents: breakdown.basePriceCents,
      captainFeeCents: breakdown.captainFeeCents || null,
      cleaningFeeCents: breakdown.cleaningFeeCents || null,
      serviceFeeCents: breakdown.serviceFeeCents,
      serviceFee,
      taxAmountCents: taxCents || null,
      discountAmountCents: discountCents || null,
      discountCode: input.discountCode,
      depositAmountCents: input.depositAmountCents,
      totalAmountCents: finalTotalCents,
      currency: input.currency,
      depositDueDate: input.depositDueDate,
      remainderDueDate: input.remainderDueDate,
    });
  }

  /**
   * Update pricing for a booking
   */
  async updatePricing(
    bookingId: string,
    updates: UpdateBookingPricingInput
  ): Promise<BookingPricing> {
    const [updated] = await db
      .update(bookingPricing)
      // Drizzle skips undefined keys, so only the fields passed are written.
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookingPricing.bookingId, bookingId))
      .returning();

    if (!updated) {
      throw new Error(`Pricing not found for booking: ${bookingId}`);
    }

    return updated;
  }
}

// Export singleton instance
export const bookingPricingService = new BookingPricingService();
