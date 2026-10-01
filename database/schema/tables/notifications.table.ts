import { pgTable, uuid, text, timestamp, index, json } from "drizzle-orm/pg-core";
import { users } from "@/database/schema/tables";

export const notifications = pgTable("notification", {
    // Core Information
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Delete notifications when user deleted
    
    // Notification Content
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: text("type").notNull(), // e.g., BOOKING_CONFIRMATION, BOOKING_REQUEST, VERIFICATION, etc.
    
    // Delivery Information
    channel: text("channel").notNull(), // SMS, EMAIL, PUSH, IN_APP
    status: text("status").default("PENDING").notNull(), // PENDING, SENT, DELIVERED, FAILED
    
    // Twilio Information (for SMS/WhatsApp)
    twilioSid: text("twilio_sid"),
    twilioStatus: text("twilio_status"),
    
    // Related Records
    relatedId: uuid("related_id"), // e.g., bookingId, verificationId
    relatedType: text("related_type"), // e.g., BOOKING, VERIFICATION
    
    // Timing
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { mode: "date", withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { mode: "date", withTimezone: true }),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    
    // Metadata
    metadata: json("metadata"),
  }, (table) => [
    index("notification_user_idx").on(table.userId),
    index("notification_status_idx").on(table.status),
    index("notification_type_idx").on(table.type),
    index("notification_related_idx").on(table.relatedId, table.relatedType),
  ]);
  