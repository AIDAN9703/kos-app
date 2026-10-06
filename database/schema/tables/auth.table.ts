import { pgTable, uuid, text, timestamp, integer, bigint, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.table";

/**
 * Better Auth tables. The `user` table is ours (users.table.ts); these hold
 * what hangs off it: signed-in devices, sign-in methods, one-time tokens and
 * rate-limit counters. Shapes follow Better Auth's core schema.
 */

/** One row per signed-in device. Deleting a row signs that device out. */
export const sessions = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Set while an admin is signed in as this user (admin plugin).
    impersonatedBy: uuid("impersonated_by"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("session_user_idx").on(table.userId)]
);

/**
 * One row per way a person can sign in: "credential" (email + password, the
 * hash lives here) or an OAuth provider such as "google".
 */
export const accounts = pgTable(
  "account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    // The provider's id for this person; the user's own id for "credential".
    accountId: text("account_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date", withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date", withTimezone: true }),
    scope: text("scope"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("account_user_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

/**
 * Email-verification and password-reset tokens. Named auth_verification
 * because the legacy Twilio table already owns "verification".
 */
export const authVerifications = pgTable(
  "auth_verification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)]
);

/** Sign-in attempt counters, shared by every server (memory would be per instance). */
export const rateLimits = pgTable("rate_limit", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
