/**
 * Payment Display Utilities
 *
 * Computes a human-friendly, booking-level payment status from raw payment
 * data. Admins see statuses like "Unpaid", "Deposit Paid", "Paid" instead
 * of raw Stripe transaction states like "PENDING" or "SUCCEEDED".
 *
 * The raw per-transaction statuses (PaymentStatus enum) are kept in the DB
 * and service layer. This module is purely for display/filtering.
 */

export const PAYMENT_DISPLAY_STATUSES = [
  "UNPAID",
  "PROCESSING",
  "DEPOSIT_PAID",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CHARGEBACK",
] as const;

export type PaymentDisplayStatus = (typeof PAYMENT_DISPLAY_STATUSES)[number];

interface PaymentDisplayInput {
  totalPaidCents: number;
  totalAmountCents: number;
  latestPaymentStatus: string | null;
  hasRefund: boolean;
}

/**
 * Derive a booking-level payment status from aggregate payment data.
 *
 * Priority order:
 *  1. Chargeback (most urgent — money disputed)
 *  2. Refunded  (money returned, net ≤ 0)
 *  3. Paid      (full amount received)
 *  4. Deposit Paid (partial amount received)
 *  5. Processing
 *  6. Failed
 *  7. Unpaid    (default)
 */
export function computePaymentDisplayStatus(
  input: PaymentDisplayInput,
): PaymentDisplayStatus {
  const { totalPaidCents, totalAmountCents, latestPaymentStatus, hasRefund } =
    input;

  if (latestPaymentStatus === "CHARGEBACK") return "CHARGEBACK";

  if (hasRefund && totalPaidCents <= 0) return "REFUNDED";

  if (totalAmountCents > 0 && totalPaidCents >= totalAmountCents) return "PAID";

  if (totalPaidCents > 0) return "DEPOSIT_PAID";

  if (latestPaymentStatus === "PROCESSING") return "PROCESSING";

  if (latestPaymentStatus === "FAILED") return "FAILED";

  return "UNPAID";
}

export const PAYMENT_DISPLAY_LABELS: Record<PaymentDisplayStatus, string> = {
  UNPAID: "Unpaid",
  PROCESSING: "Processing",
  DEPOSIT_PAID: "Deposit Paid",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  CHARGEBACK: "Chargeback",
};
