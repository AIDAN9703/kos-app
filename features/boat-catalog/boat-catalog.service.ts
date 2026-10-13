import "server-only";

import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/database/db";
import { boatMakes, boatModels, boats } from "@/database/schema";
import {
  catalogKey,
  catalogSlug,
  cleanCatalogName,
  isOtherChoice,
  makeKey,
  stripMakeFromModel,
} from "./boat-catalog.keys";
import type { CatalogMake } from "./boat-catalog.types";

/**
 * Boat makes and models (boat_make, boat_model). Not access-checked here:
 * callers go through boat-catalog.data.ts or a boat service.
 */

/** Alphabetical regardless of case: "Cabo" before "CRN". */
function byName(column: AnyPgColumn): SQL {
  return sql`lower(${column})`;
}

/** Every make with its models, for the make and model pickers. */
export async function listCatalog(): Promise<CatalogMake[]> {
  const [makes, models] = await Promise.all([
    db
      .select({ id: boatMakes.id, name: boatMakes.name })
      .from(boatMakes)
      .orderBy(byName(boatMakes.name)),
    db
      .select({ id: boatModels.id, makeId: boatModels.makeId, name: boatModels.name })
      .from(boatModels)
      .orderBy(byName(boatModels.name)),
  ]);
  const byMake = new Map<string, { id: string; name: string }[]>();
  for (const { makeId, ...model } of models) {
    byMake.set(makeId, [...(byMake.get(makeId) ?? []), model]);
  }
  return makes.map((make) => ({ ...make, models: byMake.get(make.id) ?? [] }));
}

type Named = { id: string; name: string };

/**
 * The make a picked name refers to ("Azimut Yachts" finds Azimut). When it
 * isn't listed, an admin's name is added; anyone else's matches nothing.
 */
async function resolveMake(name: string, canAdd: boolean): Promise<Named | null> {
  const key = makeKey(name);
  if (!key) return null;
  const makes = await db.select({ id: boatMakes.id, name: boatMakes.name }).from(boatMakes);
  const known = makes.find((m) => makeKey(m.name) === key);
  if (known || !canAdd) return known ?? null;

  const slug = catalogSlug(name);
  const [created] = await db
    .insert(boatMakes)
    .values({ name, slug })
    .onConflictDoNothing({ target: boatMakes.slug })
    .returning({ id: boatMakes.id, name: boatMakes.name });
  if (created) return created;
  // Another make already has this URL name ("Sea-Ray Boats" next to "Sea Ray-Boats").
  const [existing] = await db
    .select({ id: boatMakes.id, name: boatMakes.name })
    .from(boatMakes)
    .where(eq(boatMakes.slug, slug));
  return existing ?? null;
}

/** The make's model for a picked name; added when an admin's isn't listed. */
async function resolveModel(make: Named, picked: string, canAdd: boolean): Promise<Named | null> {
  const name = stripMakeFromModel(picked, make.name);
  const key = catalogKey(name);
  if (!key) return null;
  const models = await db
    .select({ id: boatModels.id, name: boatModels.name })
    .from(boatModels)
    .where(eq(boatModels.makeId, make.id));
  const known = models.find((m) => catalogKey(m.name) === key);
  if (known || !canAdd) return known ?? null;

  const slug = catalogSlug(name);
  const [created] = await db
    .insert(boatModels)
    .values({ makeId: make.id, name, slug })
    .onConflictDoNothing({ target: [boatModels.makeId, boatModels.slug] })
    .returning({ id: boatModels.id, name: boatModels.name });
  if (created) return created;
  const [existing] = await db
    .select({ id: boatModels.id, name: boatModels.name })
    .from(boatModels)
    .where(and(eq(boatModels.makeId, make.id), eq(boatModels.slug, slug)));
  return existing ?? null;
}

export interface ResolvedMakeAndModel {
  makeId: string | null;
  modelId: string | null;
  /** The names as the catalog spells them, for building a boat's default name. */
  makeName: string | null;
  modelName: string | null;
}

/**
 * The ids to store for a boat's make and model names. "Other", an empty
 * name, or (unless `canAdd`) a name that isn't listed leaves it empty. A
 * model always belongs to a make, so no make means no model.
 */
export async function resolveMakeAndModel(
  input: { make?: string | null; model?: string | null },
  { canAdd }: { canAdd: boolean }
): Promise<ResolvedMakeAndModel> {
  const none = { makeId: null, modelId: null, makeName: null, modelName: null };
  const pickedMake = cleanCatalogName(input.make);
  if (!pickedMake || isOtherChoice(pickedMake)) return none;
  const make = await resolveMake(pickedMake, canAdd);
  if (!make) return none;

  const pickedModel = cleanCatalogName(input.model);
  const model =
    pickedModel && !isOtherChoice(pickedModel)
      ? await resolveModel(make, pickedModel, canAdd)
      : null;
  return {
    makeId: make.id,
    modelId: model?.id ?? null,
    makeName: make.name,
    modelName: model?.name ?? null,
  };
}

/** WHERE clause: the boat's make or model name contains the pattern (ILIKE). */
export function makeOrModelLike(pattern: string): SQL {
  return sql`(${boats.makeId} IN (SELECT ${boatMakes.id} FROM ${boatMakes} WHERE ${boatMakes.name} ILIKE ${pattern})
    OR ${boats.modelId} IN (SELECT ${boatModels.id} FROM ${boatModels} WHERE ${boatModels.name} ILIKE ${pattern}))`;
}
