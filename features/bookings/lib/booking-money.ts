import { computeEffectiveGmvCents, computeOpsRevenueCents } from "@/shared/lib/utils/ops-revenue";
import type { PaymentDisplayStatus } from "@/shared/lib/utils/payment-display";
import { computePaymentDisplayStatus } from "@/shared/lib/utils/payment-display";
import { depositCharge } from "@/features/bookings/lib/charge-plan";

/**
 * ONE place for a booking's money math. Two questions, kept apart:
 *   customer money — what they owe / have paid (fee-aware)
 *   deal economics — what KOS makes (GMV, expenses, revenue)
 * Every surface (board, detail page, proposal page, dashboard, assistant)
 * reads these instead of re-deriving totals.
 */

export interface PricingLike {
  totalAmountCents: number | null | undefined;
  serviceFeeCents?: number | null;
  serviceFeeWaived?: boolean | null;
}

/** The total the customer actually owes: stored total, minus the card fee when waived. */
export function effectiveTotalCents(p: PricingLike): number {
  const total = p.totalAmountCents ?? 0;
  const fee = p.serviceFeeCents ?? 0;
  return p.serviceFeeWaived ? Math.max(0, total - fee) : total;
}

/** Stored total minus the card fee — what the boats + extras are worth. */
export function subtotalCents(p: PricingLike): number {
  return Math.max(0, (p.totalAmountCents ?? 0) - (p.serviceFeeCents ?? 0));
}

export interface CustomerMoney {
  subtotalCents: number;
  serviceFeeCents: number;
  serviceFeeWaived: boolean;
  /** What the customer owes in total (fee-aware). */
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  depositCents: number | null;
  /** What the guest is charged for the deposit: deposit + its card fee. */
  depositChargeCents: number | null;
  depositFeeCents: number | null;
  status: PaymentDisplayStatus;
}

export function customerMoney(input: PricingLike & {
  totalPaidCents: number | null | undefined;
  depositAmountCents?: number | null;
  latestPaymentStatus?: string | null;
  hasRefund?: boolean | null;
}): CustomerMoney {
  const totalCents = effectiveTotalCents(input);
  const paidCents = input.totalPaidCents ?? 0;
  const deposit = depositCharge({
    bookingId: "",
    totalCents: input.totalAmountCents ?? 0,
    serviceFeeCents: input.serviceFeeCents ?? 0,
    serviceFeeWaived: Boolean(input.serviceFeeWaived),
    depositCents: input.depositAmountCents ?? null,
    paidCents: 0,
  });
  return {
    subtotalCents: subtotalCents(input),
    serviceFeeCents: input.serviceFeeCents ?? 0,
    serviceFeeWaived: Boolean(input.serviceFeeWaived),
    totalCents,
    paidCents,
    balanceCents: Math.max(0, totalCents - paidCents),
    depositCents: input.depositAmountCents && input.depositAmountCents > 0 ? input.depositAmountCents : null,
    depositChargeCents: deposit?.amountCents ?? null,
    depositFeeCents: deposit?.feeCents ?? null,
    status: computePaymentDisplayStatus({
      totalPaidCents: paidCents,
      totalAmountCents: totalCents,
      latestPaymentStatus: input.latestPaymentStatus ?? null,
      hasRefund: Boolean(input.hasRefund),
    }),
  };
}

export interface DealEconomics {
  gmvCents: number | null;
  /** True when ops overrode GMV away from the quote. */
  gmvOverridden: boolean;
  expenseCents: number;
  revenueCents: number | null;
  commissionCents: number;
}

export function dealEconomics(input: PricingLike & {
  opsGmvCents: number | null | undefined;
  opsExpenseCents: number | null | undefined;
  commissionAgentCents?: number | null;
  commissionKosCents?: number | null;
}): DealEconomics {
  const gmvCents = computeEffectiveGmvCents(input.opsGmvCents, input.totalAmountCents, input.serviceFeeCents);
  const quoteGmv = subtotalCents(input);
  return {
    gmvCents,
    gmvOverridden: input.opsGmvCents != null && input.opsGmvCents !== quoteGmv,
    expenseCents: input.opsExpenseCents ?? 0,
    revenueCents: computeOpsRevenueCents(input.opsGmvCents, input.totalAmountCents, input.opsExpenseCents, input.serviceFeeCents),
    commissionCents: (input.commissionAgentCents ?? 0) + (input.commissionKosCents ?? 0),
  };
}
