/**
 * Money Utilities
 * 
 * All monetary values in the database are stored as CENTS (bigint).
 * This matches Stripe's API and ensures precision in calculations.
 * 
 * RULES:
 * - Database stores cents (e.g., $10.50 = 1050)
 * - Display layer converts to dollars for UI
 * - Never do floating-point math with money - always use integers
 */

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert dollars to cents for storage
 * $10.50 → 1050
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars for display
 * 1050 → 10.50
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format cents as currency string for display
 * 1050 → "$10.50"
 * 
 * @param cents - Amount in cents
 * @param options - Formatting options
 */
export function formatCentsAsCurrency(
  cents: number,
  options: {
    showCents?: boolean;
    currency?: string;
  } = {}
): string {
  const { showCents = true, currency = 'USD' } = options;
  const dollars = centsToDollars(cents);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(dollars);
}

/**
 * Format cents as whole dollars (no cents shown)
 * 1050 → "$11" (rounded)
 * 10000 → "$100"
 */
/**
 * Compact money for dense surfaces (stat tiles, chips, chart labels):
 * $9,800 → "$9,800", $16,030 → "$16K", $1,650,000 → "$1.65M".
 */
export function formatCentsCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (dollars >= 10_000) return `$${(dollars / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return formatCentsAsWholeDollars(cents);
}

export function formatCentsAsWholeDollars(cents: number): string {
  return formatCentsAsCurrency(cents, { showCents: false });
}

// ============================================================================
// ARITHMETIC FUNCTIONS (all in cents)
// ============================================================================

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Parse a dollar string input to cents
 * "10.50" → 1050
 * "10" → 1000
 * 
 * Throws if input is invalid
 */
export function parseDollarsToCents(input: string): number {
  const parsed = parseFloat(input);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid dollar amount: ${input}`);
  }
  return dollarsToCents(parsed);
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Type for monetary values in cents
 * Use this to make it clear a value is in cents
 */
export type Cents = number;

