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
import { eq, and, asc, desc, inArray, isNull, ne, sql, type AnyColumn, type SQL } from 'drizzle-orm';
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
  stripeCustomerId?: string | null;
  notes?: string | null;
  processedAt?: Date | null;
}

// ============================================================================
// NET PAID
// ============================================================================

/**
 * Money a booking has actually kept, in cents: succeeded payments minus
 * succeeded refunds, never below zero. The one definition every list, page,
 * filter and charge plan uses. (Payments a full refund marked REFUNDED before
 * refunds became their own rows are excluded by their status.)
 */
export function netPaidCentsSql(bookingId: AnyColumn | SQL) {
  return sql<number>`GREATEST(COALESCE((
    SELECT SUM(CASE WHEN p.payment_type = 'REFUND' THEN -p.amount_cents ELSE p.amount_cents END)
    FROM payment p
    WHERE p.payable_type = 'BOOKING' AND p.payable_id = ${bookingId} AND p.status = 'SUCCEEDED'
  ), 0), 0)`;
}

/** Same rule over loaded rows. */
export function netPaidCents(rows: Pick<Payment, 'status' | 'paymentType' | 'amountCents'>[]): number {
  const net = rows.reduce((sum, p) => {
    if (p.status !== 'SUCCEEDED') return sum;
    return p.paymentType === 'REFUND' ? sum - Number(p.amountCents) : sum + Number(p.amountCents);
  }, 0);
  return Math.max(0, net);
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
   * Money each booking has kept (net of refunds; see netPaidCentsSql).
   * Bookings with nothing paid map to 0.
   */
  async getPaidCentsByBooking(bookingIds: string[]): Promise<Map<string, number>> {
    const paid = new Map(bookingIds.map((id) => [id, 0]));
    if (bookingIds.length === 0) return paid;
    const rows = await db
      .select({
        bookingId: payments.payableId,
        paid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} = 'REFUND' THEN -${payments.amountCents} ELSE ${payments.amountCents} END), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.payableType, 'BOOKING'),
          inArray(payments.payableId, bookingIds),
          eq(payments.status, 'SUCCEEDED')
        )
      )
      .groupBy(payments.payableId);
    for (const row of rows) paid.set(row.bookingId, Math.max(0, Number(row.paid)));
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
   * Move every row on a checkout session from one of `from` to `to`
   * (async payment processing / failed, expired sessions).
   */
  async setStatusForSession(
    checkoutSessionId: string,
    from: PaymentStatus[],
    to: PaymentStatus
  ): Promise<Payment[]> {
    return db
      .update(payments)
      .set({ status: to })
      .where(and(eq(payments.stripeCheckoutSessionId, checkoutSessionId), inArray(payments.status, from)))
      .returning();
  }

  /**
   * The rows that took money on a payment intent (refund rows excluded),
   * oldest first. A charter party's payment has one per boat.
   */
  async getChargeRowsForIntent(stripePaymentIntentId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.stripePaymentIntentId, stripePaymentIntentId),
          ne(payments.paymentType, 'REFUND'),
          inArray(payments.status, ['SUCCEEDED', 'REFUNDED', 'CHARGEBACK'])
        )
      )
      .orderBy(asc(payments.createdAt), asc(payments.id));
  }

  /** Move a payment intent's charge rows from one of `from` to `to` (disputes). */
  async setChargeStatusForIntent(
    stripePaymentIntentId: string,
    from: PaymentStatus[],
    to: PaymentStatus
  ): Promise<Payment[]> {
    return db
      .update(payments)
      .set({ status: to })
      .where(
        and(
          eq(payments.stripePaymentIntentId, stripePaymentIntentId),
          ne(payments.paymentType, 'REFUND'),
          inArray(payments.status, from)
        )
      )
      .returning();
  }

  /** Refund rows recorded against a payment intent. */
  async getRefundRowsForIntent(stripePaymentIntentId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(and(eq(payments.stripePaymentIntentId, stripePaymentIntentId), eq(payments.paymentType, 'REFUND')));
  }

  /**
   * Record one Stripe refund's share of one charge row, or update it (status
   * or amount) when it already exists. Keyed by (refund id, charge row).
   */
  async upsertRefund(input: {
    refundedPayment: Payment;
    stripeRefundId: string;
    amountCents: Cents;
    status: PaymentStatus;
    processedAt: Date;
    notes: string;
  }): Promise<void> {
    const charge = input.refundedPayment;
    await db
      .insert(payments)
      .values({
        payableType: charge.payableType,
        payableId: charge.payableId,
        paymentType: 'REFUND',
        amountCents: input.amountCents,
        currency: charge.currency,
        status: input.status,
        paymentMethodType: charge.paymentMethodType,
        stripePaymentIntentId: charge.stripePaymentIntentId,
        stripeCustomerId: charge.stripeCustomerId,
        stripeRefundId: input.stripeRefundId,
        refundedPaymentId: charge.id,
        notes: input.notes,
        processedAt: input.processedAt,
      })
      .onConflictDoUpdate({
        target: [payments.stripeRefundId, payments.refundedPaymentId],
        set: { amountCents: input.amountCents, status: input.status },
      });
  }

  /** Remove one refund share (its allocation dropped to zero). */
  async deleteRefundShare(stripeRefundId: string, refundedPaymentId: string): Promise<void> {
    await db
      .delete(payments)
      .where(
        and(
          eq(payments.paymentType, 'REFUND'),
          eq(payments.stripeRefundId, stripeRefundId),
          eq(payments.refundedPaymentId, refundedPaymentId)
        )
      );
  }

  /**
   * Refund rows written for a payment intent before refunds were keyed by
   * Stripe refund id. They carried Stripe's running total, so a sync from
   * Stripe's own refund list replaces them.
   */
  async deleteUnkeyedRefundRows(stripePaymentIntentId: string): Promise<void> {
    await db
      .delete(payments)
      .where(
        and(
          eq(payments.paymentType, 'REFUND'),
          eq(payments.stripePaymentIntentId, stripePaymentIntentId),
          isNull(payments.stripeRefundId)
        )
      );
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

}

// Export singleton instance
export const paymentService = new PaymentService();
