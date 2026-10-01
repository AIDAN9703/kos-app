import { pgTable, text, boolean, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { userStatusEnum, notificationPreferenceEnum, authProviderEnum } from "@/database/schema/enums";



export const users = pgTable(
  "user",
  {
    // Core Identity
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    email: text("email").notNull().unique(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    status: userStatusEnum("status").default("ACTIVE").notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),

    // Personal Information
    firstName: text("first_name"),
    lastName: text("last_name"),
    phoneNumber: text("phone_number"),
    birthday: timestamp("birthday", { mode: "date", withTimezone: true }),
    bio: text("bio"),

    // Profile Media
    profileImage: text("profile_image"),

    // Authentication & Security
    emailVerified: boolean("email_verified").default(false).notNull(),
    phoneVerified: boolean("phone_verified").default(false).notNull(),
    authProvider: authProviderEnum("auth_provider").default("EMAIL"),
    providerAccountId: text("provider_account_id"),

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
    index("is_admin_idx").on(table.isAdmin),
    // Search-specific indexes
    index("user_search_name_idx").on(table.firstName, table.lastName),
    index("user_search_username_idx").on(table.username),
  ]
);