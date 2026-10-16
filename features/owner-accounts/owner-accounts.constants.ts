import { formatPhoneNumberForDisplay } from "@/shared/lib/utils/general-utils";
import type { OwnerAccountKind, OwnerAccountRole, OwnerPayoutMethod } from "./owner-accounts.types";

export const OWNER_ROLE_LABELS: Record<OwnerAccountRole, { label: string; description: string }> = {
  OWNER: { label: "Owner", description: "Everything, including earnings and how they're paid." },
  MANAGER: { label: "Manager", description: "Boats, calendar and charters. No money." },
};

export const OWNER_KIND_LABELS: Record<OwnerAccountKind, string> = {
  INDIVIDUAL: "Individual",
  BUSINESS: "Business",
};

export const PAYOUT_METHOD_LABELS: Record<OwnerPayoutMethod, string> = {
  STRIPE: "Direct deposit",
  ZELLE: "Zelle",
};

/** A Zelle email as is, a Zelle phone as +1 (305) 555-0142. */
export const zelleLabel = (contact: string) =>
  contact.includes("@") ? contact : formatPhoneNumberForDisplay(contact);

/**
 * Direct deposit owners are paid automatically this long after a trip ends
 * (a day to catch a problem first). The run is daily: see vercel.json.
 */
export const AUTO_PAYOUT_DELAY_HOURS = 24;

/** The daily run's hour (UTC), matching the cron schedule in vercel.json. */
export const AUTO_PAYOUT_RUN_HOUR_UTC = 15;

/** When the daily run pays a charter that ended at `tripEnd` (never in the past). */
export function autoPayoutDate(tripEnd: Date, now = new Date()): Date {
  const earliest = Math.max(tripEnd.getTime() + AUTO_PAYOUT_DELAY_HOURS * 36e5, now.getTime());
  const run = new Date(earliest);
  run.setUTCHours(AUTO_PAYOUT_RUN_HOUR_UTC, 0, 0, 0);
  if (run.getTime() < earliest) run.setUTCDate(run.getUTCDate() + 1);
  return run;
}

/** Invites stay open for two weeks. */
export const INVITE_DAYS = 14;

/** The owner portal remembers which owner a person with several is looking at. */
export const OWNER_ACCOUNT_COOKIE = "kos_owner_account";
