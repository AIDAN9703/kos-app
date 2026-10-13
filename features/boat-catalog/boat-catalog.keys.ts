/**
 * How make and model names are compared, so "Azimut Yachts", "azimut" and
 * "Azimut " all find the same make. Pure: the pickers use it in the browser,
 * the service on the server, and migration 0072 has the same rules in SQL
 * (catalog_key, make_key, catalog_slug).
 */

const ACCENTS = /[\u0300-\u036f]/g;

/** A trailing word that isn't part of the make: "Azimut Yachts" is Azimut. "Numarine" keeps its "marine". */
const MAKE_SUFFIX =
  /\s+(yachts?|boats?|marine|boatworks|shipyard|catamarans?|group|international|inc\.?|llc)$/;

/** What an owner picks when their make or model isn't listed. Stored as empty. */
export const OTHER_CHOICE = "Other";

export function isOtherChoice(value: string | null | undefined): boolean {
  return value === OTHER_CHOICE;
}

/** A picked name as it reads to people: "Other" reads as nothing. */
export function shownCatalogName(value: string | null | undefined): string {
  return !value || isOtherChoice(value) ? "" : value;
}

function fold(text: string): string {
  return text.normalize("NFD").replace(ACCENTS, "").toLowerCase();
}

/** Lowercase letters and digits only: "55 Fly" and "55-Fly" are the same model. */
export function catalogKey(text: string): string {
  return fold(text).replace(/[^a-z0-9]/g, "");
}

/** A make's key: catalogKey without a trailing "Yachts", "Boats", "Marine"… word. */
export function makeKey(text: string): string {
  return catalogKey(fold(text).trim().replace(MAKE_SUFFIX, ""));
}

/** URL-safe name: "Sea Ray" → "sea-ray". */
export function catalogSlug(text: string): string {
  return fold(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Trimmed, single spaces: how an added name is saved. */
export function cleanCatalogName(text: string | null | undefined): string {
  return (text ?? "").trim().replace(/\s+/g, " ");
}

/** A model that repeats its make loses it: "Azimut 88" under Azimut is "88". "WallyPower 85" stays. */
export function stripMakeFromModel(model: string, makeName: string): string {
  const escaped = makeName.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  return cleanCatalogName(model.replace(new RegExp(`^${escaped}([\\s:/-]+|$)`, "i"), ""));
}
