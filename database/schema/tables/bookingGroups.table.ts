import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "@/database/schema/tables";

export const bookingGroups = pgTable(
  "booking_group",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    name: text("name"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("booking_group_created_by_idx").on(table.createdById),
    index("booking_group_created_at_idx").on(table.createdAt),
  ]
);
  