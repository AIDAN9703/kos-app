import { relations } from "drizzle-orm";
import { boatMakes } from "../tables/boatMakes.table";
import { boatModels } from "../tables/boatModels.table";
import { boats } from "../tables/boats.table";

export const boatMakesRelations = relations(boatMakes, ({ many }) => ({
  models: many(boatModels),
  boats: many(boats),
}));

export const boatModelsRelations = relations(boatModels, ({ one, many }) => ({
  make: one(boatMakes, {
    fields: [boatModels.makeId],
    references: [boatMakes.id],
  }),
  boats: many(boats),
}));
