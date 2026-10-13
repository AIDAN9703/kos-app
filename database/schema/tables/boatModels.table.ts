import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { boatMakes } from "./boatMakes.table";

/**
 * Boat models, each under one make (Azimut → "55 Flybridge"). Seeded from
 * existing boats (migration 0072); admins add one from the boat form.
 */
export const boatModels = pgTable(
  "boat_model",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    makeId: uuid("make_id")
      .notNull()
      .references(() => boatMakes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** URL-safe name, unique within the make. */
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("boat_model_make_slug_unique").on(table.makeId, table.slug),
    // Target of boat's (make_id, model_id) foreign key: a boat's model must belong to its make.
    unique("boat_model_make_id_id_unique").on(table.makeId, table.id),
    index("boat_model_make_idx").on(table.makeId),
  ]
);
