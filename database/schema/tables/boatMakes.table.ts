import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Boat makes: Azimut, Sea Ray, Sunseeker… One row per make. Seeded with the
 * makes we know (migration 0072); admins add one from the boat form when a
 * boat's make isn't listed.
 */
export const boatMakes = pgTable("boat_make", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  name: text("name").notNull(),
  /** URL-safe name ("sea-ray"); unique, so two makes can't share a name. */
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});
