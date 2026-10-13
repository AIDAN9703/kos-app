import "server-only";

import * as catalogService from "./boat-catalog.service";
import type { CatalogMake } from "./boat-catalog.types";

/** Boat makes and models for the pickers. Public: names only. */
export async function getBoatCatalog(): Promise<CatalogMake[]> {
  return catalogService.listCatalog();
}
