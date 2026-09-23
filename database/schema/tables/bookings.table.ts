import { pgTable, uuid, text, boolean, timestamp, index, json, integer, bigint, date, unique } from "drizzle-orm/pg-core";
import { users, boats, boatPricingTiers, bookingGroups } from "@/database/schema/tables";
import {
  bookingStatusEnum,
  bookingTypeEnum,
  bookingSourceEnum,
  preferredTimeOfDayEnum,
} from "@/database/schema/enums";

export const bookings = pgTable(
  "booking",
  {
    // ==========================================================================
    // CORE BOOKING INFORMATION
    // ==========================================================================
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    bookingType: bookingTypeEnum("booking_type").default("EXTERNAL_BOOKING").notNull(),
    bookingStatus: bookingStatusEnum("booking_status").default("INQUIRY").notNull(),
    source: bookingSourceEnum("source").default("WEBSITE"),

    // ==========================================================================
    // RELATIONSHIPS
    // ==========================================================================
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    boatOwnerId: uuid("boat_owner_id").references(() => users.id, { onDelete: "set null" }),
    // Nullable: INQUIRY-status deals may not have chosen a boat yet.
    boatId: uuid("boat_id").references(() => boats.id, { onDelete: "restrict" }),
    captainUserId: uuid("captain_user_id").references(() => users.id, { onDelete: "set null" }),
    pricingTierId: uuid("pricing_tier_id").references(() => boatPricingTiers.id, { onDelete: "set null" }),
    bookingGroupId: uuid("booking_group_id").references(() => bookingGroups.id, { onDelete: "set null" }),
    assignedAdminId: uuid("assigned_admin_id").references(() => users.id, { onDelete: "set null" }),

    // ==========================================================================
    // CUSTOMER INFORMATION
    // ==========================================================================
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),

    // ==========================================================================
    // BOOKING DETAILS
    // Nullable because an INQUIRY-status deal has no confirmed trip yet;
    // status transitions past INQUIRY require these (enforced in services).
    // ==========================================================================
    isMultiDay: boolean("is_multi_day"),
    needsCaptain: boolean("needs_captain").default(false),
    startDateTime: timestamp("start_datetime", { mode: "date", withTimezone: true }),
    endDateTime: timestamp("end_datetime", { mode: "date", withTimezone: true }),
    numberOfPassengers: integer("number_of_passengers"),
    pickupLocation: text("pickup_location"),
    dropoffLocation: text("dropoff_location"),
    specialRequests: text("special_requests"),
    occasionType: text("occasion_type"),
    addOns: json("add_ons"),
    adminNotes: text("admin_notes"),

    // ==========================================================================
    // LEAD INTAKE (INQUIRY phase) — the customer's ask before it's priced.
    // Flat nullable scalars by design: they don't repeat, so no spoke table.
    // ==========================================================================
    customerMessage: text("customer_message"),
    preferredDate: date("preferred_date"),
    preferredTimeOfDay: preferredTimeOfDayEnum("preferred_time_of_day"),
    requestedDurationDays: integer("requested_duration_days"),
    destination: text("destination"),
    budgetCents: bigint("budget_cents", { mode: "number" }),
    /** Rough deal value before real pricing exists (est. from tier/budget). */
    estimatedValueCents: bigint("estimated_value_cents", { mode: "number" }),
    smsConsent: boolean("sms_consent").default(false).notNull(),
    termsAccepted: boolean("terms_accepted"),

    // ==========================================================================
    // LIFECYCLE DERIVATION MARKS (see docs/UNIFIED_BOOKINGS_PLAN.md)
    // ==========================================================================
    /** First real contact — INQUIRY + set = the "Contacted" pipeline step. */
    firstContactedAt: timestamp("first_contacted_at", { mode: "date", withTimezone: true }),
    /** Lead marked cold (INQUIRY rows only); cleared on revive. */
    coldAt: timestamp("cold_at", { mode: "date", withTimezone: true }),
    /** Hidden from the default master list; the boss's "archive" bucket. */
    archivedAt: timestamp("archived_at", { mode: "date", withTimezone: true }),
    /** Migration audit breadcrumb: the source inquiry id, if this deal was backfilled. */
    legacyInquiryId: uuid("legacy_inquiry_id"),

    // ==========================================================================
    // PROPOSAL FLOW (sent to customer, awaiting acceptance)
    // ==========================================================================
    publicToken: uuid("public_token"), // Shareable link; set when "sent to customer"
    allowPayment: boolean("allow_payment").default(false).notNull(),
    /**
     * LEGACY (unused since 2026-09-23): the admin's deposit-vs-full default.
     * Deposits are now driven only by booking_pricing.deposit_amount_cents —
     * an amount means the guest may pay it first. Drop in a later migration.
     */
    paymentType: text("payment_type").default("FULL_PAYMENT"),
    publishedAt: timestamp("published_at", { mode: "date", withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { mode: "date", withTimezone: true }),
    acceptedCustomerNote: text("accepted_customer_note"),

    // ==========================================================================
    // CANCELLATION
    // ==========================================================================
    cancelledAt: timestamp("cancelled_at", { mode: "date", withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: uuid("cancelled_by").references(() => users.id, { onDelete: "set null" }),

    // ==========================================================================
    // TIMESTAMPS
    // ==========================================================================
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    unique("booking_public_token_unique").on(table.publicToken),
    index("booking_type_idx").on(table.bookingType),
    index("booking_status_idx").on(table.bookingStatus),
    index("booking_source_idx").on(table.source),
    index("booking_user_idx").on(table.userId),
    index("booking_boat_idx").on(table.boatId),
    index("booking_captain_idx").on(table.captainUserId),
    index("booking_group_idx").on(table.bookingGroupId),
    index("booking_public_token_idx").on(table.publicToken),
    index("booking_datetime_idx").on(table.startDateTime, table.endDateTime),
    index("booking_assigned_admin_idx").on(table.assignedAdminId),
    index("booking_search_customer_idx").on(table.customerName, table.customerEmail),
    index("booking_archived_idx").on(table.archivedAt),
    index("booking_created_idx").on(table.createdAt),
  ]
);
