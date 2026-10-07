/**
 * Supported currencies for boat listings.
 *
 * Currency lives on the boat itself: each boat is listed/quoted/charged in a
 * single currency for its lifetime. Greek boats use EUR, US boats use USD.
 *
 * Stripe accepts all of these natively on a US account — non-USD payments
 * settle to USD at Stripe's daily FX rate unless multi-currency settlement
 * is enabled in the Stripe Dashboard.
 */
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP"] as const;

type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const DEFAULT_CURRENCY: SupportedCurrency = "USD";

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: "US Dollar (USD)",
  EUR: "Euro (EUR)",
  GBP: "British Pound (GBP)",
};

/**
 * Single-character symbol for inline labels (e.g. "Cleaning Fee (€)").
 * Use {@link formatCurrency} or {@link formatCentsAsCurrency} for actual
 * value rendering — those go through Intl.NumberFormat and produce proper
 * locale-aware output (e.g. "€1.234,56" vs "$1,234.56").
 */
const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function getCurrencySymbol(currency: string | null | undefined): string {
  if (!currency) return CURRENCY_SYMBOLS[DEFAULT_CURRENCY];
  const upper = currency.toUpperCase() as SupportedCurrency;
  return CURRENCY_SYMBOLS[upper] ?? upper;
}

/**
 * Normalize a free-form currency string to a supported currency code or the
 * default. Used at boundaries where the value might be missing or lowercase.
 */
export function normalizeCurrency(value: string | null | undefined): SupportedCurrency {
  if (!value) return DEFAULT_CURRENCY;
  const upper = value.toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as SupportedCurrency)
    : DEFAULT_CURRENCY;
}
