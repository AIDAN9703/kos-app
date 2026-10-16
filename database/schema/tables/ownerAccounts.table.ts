import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import {
  ownerAccountKindEnum,
  ownerAccountRoleEnum,
  ownerPayoutMethodEnum,
} from "@/database/schema/enums";
import { users } from "./users.table";

/**
 * An owner: who a boat belongs to and who KOS pays. One person ("Jane
 * Smith") or a business. It isn't a login; people's logins join it as
 * members. KOS creates it (an admin, or the List your boat flow), and it can
 * exist before anyone has signed in to claim it. The house account (KOS
 * Yachts) holds boats whose real owner isn't set up yet.
 *
 * Payouts go by direct deposit (a Stripe Connect Express account the owner
 * sets up on Stripe's site, so KOS never sees bank details) or by Zelle.
 */
export const ownerAccounts = pgTable(
  "owner_account",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    name: text("name").notNull(),
    kind: ownerAccountKindEnum("kind").default("INDIVIDUAL").notNull(),
    /** KOS Yachts, the one house account. */
    isHouse: boolean("is_house").default(false).notNull(),
    /** Who KOS talks to about these boats; prefills the first invite. */
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    /** How they'd like to be paid. */
    payoutMethod: ownerPayoutMethodEnum("payout_method"),
    /** The email or phone their Zelle uses. */
    zelleContact: text("zelle_contact"),
    /** Their Stripe Connect Express account (acct_…). */
    stripeAccountId: text("stripe_account_id").unique(),
    /** Stripe has what it needs to pay them (synced from Stripe). */
    stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false).notNull(),
    /** Last four digits of the bank Stripe pays, for showing which one. */
    stripeBankLast4: text("stripe_bank_last4"),
    /** Internal, admins only. */
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("owner_account_one_house_idx").on(table.isHouse).where(sql`${table.isHouse}`),
  ]
);

/** A person's place in an owner account. */
export const ownerAccountMembers = pgTable(
  "owner_account_member",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => ownerAccounts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: ownerAccountRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("owner_account_member_unique").on(table.ownerAccountId, table.userId),
    index("owner_account_member_user_idx").on(table.userId),
  ]
);

/**
 * An emailed invitation to join an owner account. The link carries a random
 * token; only its hash is stored. Accepting needs a login with the invited
 * email.
 */
export const ownerAccountInvites = pgTable(
  "owner_account_invite",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => ownerAccounts.id, { onDelete: "cascade" }),
    /** Lowercased. */
    email: text("email").notNull(),
    role: ownerAccountRoleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("owner_account_invite_account_idx").on(table.ownerAccountId),
    // One open invite per email per account; inviting again replaces it.
    uniqueIndex("owner_account_invite_open_idx")
      .on(table.ownerAccountId, table.email)
      .where(sql`${table.acceptedAt} IS NULL`),
  ]
);
