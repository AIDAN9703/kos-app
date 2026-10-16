import { pgEnum } from "drizzle-orm/pg-core";

/** One person, or a company (an LLC, a charter business). */
export const ownerAccountKindEnum = pgEnum("OwnerAccountKind", ["INDIVIDUAL", "BUSINESS"]);

/** Owners see everything, money included; managers run boats, calendar and charters. */
export const ownerAccountRoleEnum = pgEnum("OwnerAccountRole", ["OWNER", "MANAGER"]);

/** How KOS pays an owner: direct deposit through Stripe, or Zelle. */
export const ownerPayoutMethodEnum = pgEnum("OwnerPayoutMethod", ["STRIPE", "ZELLE"]);

/** A Stripe payout is PENDING while KOS asks Stripe for it; a Zelle one is recorded as PAID. */
export const ownerPayoutStatusEnum = pgEnum("OwnerPayoutStatus", ["PENDING", "PAID", "FAILED"]);
