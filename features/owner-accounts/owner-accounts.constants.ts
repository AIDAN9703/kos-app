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

/** Invites stay open for two weeks. */
export const INVITE_DAYS = 14;

/** The owner portal remembers which owner a person with several is looking at. */
export const OWNER_ACCOUNT_COOKIE = "kos_owner_account";
