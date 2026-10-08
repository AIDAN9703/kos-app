import { index, pgTable, text, timestamp, uniqueIndex, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "./users.table";
import { marketingCampaignStatusEnum } from "../enums/marketing.enums";

/**
 * Who may receive marketing email. Separate from user accounts: a contact is
 * an email address with a name, where it came from, and whether it has
 * unsubscribed. Accounts and booked customers are added automatically;
 * imported lists come in through CSV. Resend holds the sending copy of each
 * contact (and its unsubscribe page); this table is the team's view of it.
 */
export const marketingContacts = pgTable(
  "marketing_contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Lowercased and trimmed; one row per address. */
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    /** The list it first came from: an import's name ("QuickBooks"), "Accounts" or "Bookings". */
    source: text("source").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    unsubscribedAt: timestamp("unsubscribed_at", { mode: "date", withTimezone: true }),
    /** Resend's id for this contact, once it exists there. */
    resendContactId: text("resend_contact_id"),
    /** When this row was last pushed to Resend; null means a change is waiting to go. */
    syncedAt: timestamp("synced_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("marketing_contact_email_unique").on(table.email),
    index("marketing_contact_source_idx").on(table.source),
    index("marketing_contact_user_idx").on(table.userId),
  ]
);

/** One marketing email: written here, sent through a Resend broadcast. */
export const marketingCampaigns = pgTable("marketing_campaign", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** For the team only; recipients never see it. */
  name: text("name").notNull(),
  subject: text("subject").notNull().default(""),
  previewText: text("preview_text").notNull().default(""),
  heading: text("heading").notNull().default(""),
  /** Plain text with blank lines between paragraphs; **bold** and [links](https://…) allowed. */
  body: text("body").notNull().default(""),
  imageUrl: text("image_url"),
  buttonLabel: text("button_label"),
  buttonUrl: text("button_url"),
  /** "ALL", or a contact source to send to just that list. */
  audience: text("audience").notNull().default("ALL"),
  status: marketingCampaignStatusEnum("status").default("DRAFT").notNull(),
  resendBroadcastId: text("resend_broadcast_id"),
  scheduledAt: timestamp("scheduled_at", { mode: "date", withTimezone: true }),
  sentAt: timestamp("sent_at", { mode: "date", withTimezone: true }),
  /** Subscribed contacts in the audience when it was sent. */
  recipientCount: integer("recipient_count"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});
