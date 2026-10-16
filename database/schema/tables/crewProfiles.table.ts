import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "@/database/schema/tables";
import { crewStatusEnum } from "@/database/schema/enums";

/**
 * Crew profiles — extension for users who can be assigned to bookings as crew.
 * Mirrors captain_profile: userId is the primary key.
 */
export const crewProfiles = pgTable(
  "crew_profile",
  {
    userId: uuid("user_id")
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),

    status: crewStatusEnum("status").default("PENDING").notNull(),
    adminNotes: text("admin_notes"),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("crew_profile_status_idx").on(table.status)]
);
