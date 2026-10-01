import { pgTable, uuid, text, integer, timestamp, index, json } from "drizzle-orm/pg-core";
import { users } from "@/database/schema/tables";
import { verificationTypeEnum, verificationChannelEnum, verificationStatusEnum } from "@/database/schema/enums";




export const verifications = pgTable("verification", {
    // Core Information
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Delete verifications when user deleted
    
    // Verification Details
    type: verificationTypeEnum("type").notNull(),
    channel: verificationChannelEnum("channel").notNull(),
    status: verificationStatusEnum("status").default("PENDING").notNull(),
    
    // Contact Information
    phoneNumber: text("phone_number"),
    email: text("email"),
    
    // Verification Code
    code: text("code").notNull(),
    codeHash: text("code_hash"), // For additional security
    
    // Twilio Information
    twilioSid: text("twilio_sid"), // Twilio verification SID
    twilioStatus: text("twilio_status"), // Status from Twilio API
    
    // Attempt Tracking
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    
    // Timing
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { mode: "date", withTimezone: true }),
    
    // Metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: json("metadata"), // For storing additional context (e.g., booking ID for booking-related verifications)
  }, (table) => [
    index("verification_user_idx").on(table.userId),
    index("verification_status_idx").on(table.status),
    index("verification_type_idx").on(table.type),
    index("verification_expires_idx").on(table.expiresAt),
  ]);