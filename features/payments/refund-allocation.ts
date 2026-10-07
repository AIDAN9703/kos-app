/**
 * Splitting refunds across the rows of one payment. A charter party pays for
 * several boats with one Stripe payment (one row per boat), but Stripe
 * refunds the payment as a whole, so each refund is shared out in proportion
 * to what each boat was charged.
 */

/** Split `total` cents in proportion to `weights` (largest remainder); always sums to `total`. */
export function splitProportionally(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (sum <= 0) return weights.map((_, i) => (i === 0 ? total : 0));
  const exact = weights.map((w) => (total * w) / sum);
  const shares = exact.map(Math.floor);
  let left = total - shares.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    shares[i] += 1;
    left -= 1;
  }
  return shares;
}

/**
 * Each refund's share per row, for refunds in the order they happened.
 * Shares are taken from the running total, so refunds that add up to the
 * whole payment give every row back exactly what it was charged.
 */
export function allocateRefunds(rowAmounts: number[], refundAmounts: number[]): number[][] {
  let cumulative = 0;
  let previous = rowAmounts.map(() => 0);
  return refundAmounts.map((amount) => {
    cumulative += amount;
    const current = splitProportionally(cumulative, rowAmounts);
    const shares = current.map((c, i) => c - previous[i]);
    previous = current;
    return shares;
  });
}
