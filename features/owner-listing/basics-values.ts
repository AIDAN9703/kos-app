import type { BasicsInput } from "./listing.validation";

/** The first step's fields as form strings (also read from the return URL after sign-up). */
export type BasicsValues = { [K in keyof BasicsInput]: string };

export function basicsValuesFrom(
  source: Partial<Record<keyof BasicsInput, unknown>>
): BasicsValues {
  const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    category: text(source.category) || "YACHT",
    make: text(source.make),
    model: text(source.model),
    yearBuilt: text(source.yearBuilt),
    lengthFt: text(source.lengthFt),
    capacity: text(source.capacity),
  };
}
