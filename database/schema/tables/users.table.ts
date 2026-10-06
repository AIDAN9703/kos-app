import { pgTable, text, boolean, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { userStatusEnum, notificationPreferenceEnum } from "@/database/schema/enums";



export const users = pgTable(
  "user",
  {
    // Core Identity
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    email: text("email").notNull().unique(),
    username: text("username").notNull().unique(),
    status: userStatusEnum("status").default("ACTIVE").notNull(),

    // Access: comma-separated roles (admin, broker, owner, captain, crew,
    // customer). See shared/lib/auth/permissions.ts.
    role: text("role").default("customer").notNull(),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { mode: "date", withTimezone: true }),

    // Personal Information
    // Display name (first + last). Better Auth requires it; kept in step with
    // firstName/lastName wherever those change.
    name: text("name").default("").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phoneNumber: text("phone_number"),
    birthday: timestamp("birthday", { mode: "date", withTimezone: true }),
    bio: text("bio"),

    // Profile Media
    profileImage: text("profile_image"),

    // Verification (sign-in methods live in the `account` table)
    emailVerified: boolean("email_verified").default(false).notNull(),
    phoneVerified: boolean("phone_verified").default(false).notNull(),

    // Notification Preferences
    emailNotifications: notificationPreferenceEnum("email_notifications").default("ALL"),
    smsNotifications: notificationPreferenceEnum("sms_notifications").default("IMPORTANT_ONLY"),
    marketingEmailsEnabled: boolean("marketing_emails_enabled").default(true).notNull(),

    // Location Information
    country: text("country"),
    state: text("state"),
    city: text("city"),
    address: text("address"),
    postalCode: text("postal_code"),

    // Verification & Compliance
    identityVerified: boolean("identity_verified").default(false),
    identityVerificationType: text("identity_verification_type"),


    // Payment Information
    stripeCustomerId: text("stripe_customer_id"),
    defaultPaymentMethodId: text("default_payment_method_id"),


    // Terms & Agreements
    termsAcceptedAt: timestamp("terms_accepted_at", { mode: "date", withTimezone: true }),
    privacyPolicyAcceptedAt: timestamp("privacy_policy_accepted_at", { mode: "date", withTimezone: true }),


    // Timestamps
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("email_idx").on(table.email),
    index("status_idx").on(table.status),
    // Search-specific indexes
    index("user_search_name_idx").on(table.firstName, table.lastName),
    index("user_search_username_idx").on(table.username),
  ]
);