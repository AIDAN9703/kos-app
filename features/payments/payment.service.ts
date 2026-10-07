import "server-only";

/**
 * Payment Service
 * 
 * Manages the payments table - a polymorphic table that can track payments
 * for any payable entity (bookings, event tickets, etc.)
 * 
 * All monetary values are in CENTS.
 */

import { db } from '@/database/db';
import { payments } from '@/database/schema';
import { eq, and, desc, inArray, ne, sql } from 'drizzle-orm';
import type { 
  Payment, 
  PaymentStatus,
  PaymentType,
  PaymentMethodType,
  PayableType
} from '@/database/types';
import type { Cents } from '@/shared/lib/utils/money-utils';

// ============================================================================
// TYPES
// ============================================================================

interface CreatePaymentInput {
  payableType: PayableType;
  payableId: string;
  paymentType: PaymentType;
  amountCents: Cents;
  currency?: string;
  status?: PaymentStatus;
  paymentMethodType: PaymentMethodType;
  paymentMethodDetail?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentLinkId?: string | null;
  stripeInvoiceId?: string | null;
  stripeCustomerId?: string | null;
  notes?: string | null;
  processedAt?: Date | null;
}

interface UpdatePaymentInput {
  status?: PaymentStatus;
  paymentMethodType?: PaymentMethodType;
  paymentMethodDetail?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentLinkId?: string | null;
  stripeInvoiceId?: string | null;
  stripeCustomerId?: string | null;
  notes?: string | null;
  processedAt?: Date | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class PaymentService {
  /**
   * Create a new payment record
   */
  async createPayment(input: CreatePaymentInput): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values({
        payableType: input.payableType,
        payableId: input.payableId,
        paymentType: input.paymentType,
        amountCents: input.amountCents,
        currency: input.currency ?? 'USD',
        status: input.status ?? 'PENDING',
        paymentMethodType: input.paymentMethodType,
        paymentMethodDetail: input.paymentMethodDetail ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
        stripePaymentLinkId: input.stripePaymentLinkId ?? null,
        stripeInvoiceId: input.stripeInvoiceId ?? null,
        stripeCustomerId: input.stripeCustomerId ?? null,
        notes: input.notes ?? null,
        processedAt: input.processedAt ?? null,
      })
      .returning();

    return payment;
  }



  /**
   * Get all payments for a payable entity (e.g., all payments for a booking)
   */
  async getPaymentsForPayable(
    payableType: PayableType,
    payableId: string
  ): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.payableType, payableType),
          eq(payments.payableId, payableId)
        )
      )
      .orderBy(desc(payments.createdAt));
  }

  /**
   * Get all payments for a booking
   */
  async getBookingPayments(bookingId: string): Promise<Payment[]> {
    return this.getPaymentsForPayable('BOOKING', bookingId);
  }

  /**
   * Money already received per booking: succeeded payments, refunds excluded.
   * Bookings with nothing paid map to 0.
   */
  async getPaidCentsByBooking(bookingIds: string[]): Promise<Map<string, number>> {
    const paid = new Map(bookingIds.map((id) => [id, 0]));
    if (bookingIds.length === 0) return paid;
    const rows = await db
      .select({
        bookingId: payments.payableId,
        paid: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.payableType, 'BOOKING'),
          inArray(payments.payableId, bookingIds),
          eq(payments.status, 'SUCCEEDED'),
          ne(payments.paymentType, 'REFUND')
        )
      )
      .groupBy(payments.payableId);
    for (const row of rows) paid.set(row.bookingId, Number(row.paid));
    return paid;
  }

  /**
   * Update a payment record
   */
  async updatePayment(id: string, updates: UpdatePaymentInput): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({
        ...updates,
      })
      .where(eq(payments.id, id))
      .returning();

    if (!payment) {
      throw new Error(`Payment not found: ${id}`);
    }

    return payment;
  }

  /**
   * Get payment by Stripe checkout session ID
   */
  async getPaymentByStripeCheckoutSessionId(checkoutSessionId: string): Promise<Payment | null> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeCheckoutSessionId, checkoutSessionId))
      .limit(1);
    
    return payment ?? null;
  }

  /**
   * All payments sharing a checkout session — a charter party (multi-boat
   * group) checkout writes one PENDING row per booking against one session.
   */
  async getPaymentsByStripeCheckoutSessionId(checkoutSessionId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.stripeCheckoutSessionId, checkoutSessionId));
  }

  /**
   * All payments sharing a payment intent — group rows settled from one
   * checkout all carry the same intent (used by refund handling).
   */
  async getPaymentsByStripeIntentId(stripePaymentIntentId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId));
  }

  /**
   * Mark a payment as succeeded
   */
  async markPaymentSucceeded(id: string, stripePaymentIntentId?: string): Promise<Payment> {
    return this.updatePayment(id, {
      status: 'SUCCEEDED',
      processedAt: new Date(),
      ...(stripePaymentIntentId && { stripePaymentIntentId }),
    });
  }



  /**
   * Mark a payment as refunded
   */
  async markPaymentRefunded(id: string): Promise<Payment> {
    return this.updatePayment(id, {
      status: 'REFUNDED',
    });
  }

  /**
   * Get payment by Stripe Payment Intent ID
   */
  async getPaymentByStripeIntentId(stripePaymentIntentId: string): Promise<Payment | null> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
      .limit(1);

    return payment ?? null;
  }

  /**
   * Get payment by Stripe Payment Link ID
   */
  async getPaymentByStripePaymentLinkId(stripePaymentLinkId: string): Promise<Payment | null> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentLinkId, stripePaymentLinkId))
      .limit(1);

    return payment ?? null;
  }

  async getPaymentByStripeInvoiceId(stripeInvoiceId: string): Promise<Payment | null> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeInvoiceId, stripeInvoiceId))
      .limit(1);

    return payment ?? null;
  }







  /**
   * Create a refund payment (negative amount conceptually, but stored as positive with REFUND type)
   */
  async createRefund(
    payableType: PayableType,
    payableId: string,
    amountCents: Cents,
    options: {
      paymentMethodType?: PaymentMethodType;
      stripePaymentIntentId?: string;
      notes?: string;
    } = {}
  ): Promise<Payment> {
    return this.createPayment({
      payableType,
      payableId,
      paymentType: 'REFUND',
      amountCents,
      paymentMethodType: options.paymentMethodType ?? 'MANUAL',
      stripePaymentIntentId: options.stripePaymentIntentId,
      notes: options.notes,
      status: 'SUCCEEDED', // Refunds are typically already processed
      processedAt: new Date(),
    });
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
