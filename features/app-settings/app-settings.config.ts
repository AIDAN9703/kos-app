/**
 * Client-safe app-settings defaults (no DB imports). Used when the
 * app_setting row doesn't exist yet (fresh database before the admin saves).
 */
export const DEFAULT_APP_SETTINGS = {
  /** 399 bps = 3.99% of every card charge… */
  serviceFeeBps: 399,
  /** …plus $0.99 per booking, collected with its first payment. */
  serviceFeeFixedCents: 99,
} as const;
