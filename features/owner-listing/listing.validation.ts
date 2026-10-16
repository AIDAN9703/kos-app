import { z } from "zod";
import {
  CANCELLATION_POLICIES,
  CAPTAIN_ARRANGEMENTS,
  LISTING_BOAT_TYPES,
  LISTING_TIMEZONES,
  TRIP_LENGTHS,
} from "./listing.constants";

/**
 * What an owner may write, one schema per step. These are the ONLY boat
 * fields reachable from the owner side: never active, featured, the owner,
 * listing status, ranking or internal notes.
 */

const thisYear = new Date().getFullYear();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();
const optionalCount = z.coerce.number().int().min(0).max(50).nullable().optional();

const enumOf = <T extends readonly { value: string }[]>(list: T) =>
  z.enum(list.map((item) => item.value) as [T[number]["value"], ...T[number]["value"][]]);

export const basicsSchema = z.object({
  category: enumOf(LISTING_BOAT_TYPES),
  // Picked names, or "Other"; the boat catalog matches them to a make and model when saving.
  make: z.string().trim().min(1, "Choose the make, or Other").max(60),
  model: z.string().trim().min(1, "Choose the model, or Other").max(60),
  yearBuilt: z.coerce
    .number({ invalid_type_error: "Add the year it was built" })
    .int()
    .min(1950, "Boats built after 1950")
    .max(thisYear + 1, "Check the year"),
  lengthFt: z.coerce
    .number({ invalid_type_error: "Add its length in feet" })
    .int()
    .min(12, "At least 12 ft")
    .max(400, "Check the length"),
  capacity: z.coerce
    .number({ invalid_type_error: "How many guests can it take?" })
    .int()
    .min(1, "At least 1 guest")
    .max(150, "Check the guest count"),
});

const locationSchema = z.object({
  locationLabel: z.string().trim().min(3, "Add the marina or dock, with the city").max(120),
  dockInfo: optionalText(500),
  parkingInfo: optionalText(500),
  timezone: enumOf(LISTING_TIMEZONES),
});

const photosSchema = z.object({
  images: z.array(z.string().url().startsWith("https://ik.imagekit.io/")).max(30),
});

const detailsSchema = z.object({
  displayTitle: z
    .string()
    .trim()
    .min(10, "At least 10 characters")
    .max(60, "60 characters at most"),
  name: optionalText(40),
  description: z.string().trim().max(3000).default(""),
  features: z.array(z.string().trim().min(2).max(80)).max(30).default([]),
  sleeps: optionalCount,
  bathrooms: optionalCount,
});

const tripsSchema = z.object({
  trips: z
    .array(
      z.object({
        hours: z.coerce
          .number()
          .refine((h) => (TRIP_LENGTHS as readonly number[]).includes(h), "Pick a listed length"),
        rate: z.coerce
          .number({ invalid_type_error: "Add what you'd earn" })
          .min(50, "At least $50")
          .max(100_000, "Check the amount"),
      })
    )
    .min(1, "Add at least one trip length"),
  captainArrangement: enumOf(CAPTAIN_ARRANGEMENTS),
  fuelIncluded: z.boolean(),
});

const rulesSchema = z.object({
  rules: optionalText(2000),
  cancellationPolicy: enumOf(CANCELLATION_POLICIES),
});

const documentsSchema = z.object({
  hullId: optionalText(20),
  registrationNumber: optionalText(30),
  insuranceInfo: optionalText(200),
  insuranceExpiry: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(`${v}T12:00:00Z`) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Check the date")
    .nullable()
    .optional(),
});

export const stepSchemas = {
  basics: basicsSchema,
  location: locationSchema,
  photos: photosSchema,
  details: detailsSchema,
  trips: tripsSchema,
  rules: rulesSchema,
  documents: documentsSchema,
} as const;

export type EditableStep = keyof typeof stepSchemas;
export type BasicsInput = z.input<typeof basicsSchema>;
