import * as z from "zod";
import { boatCategoryEnum } from "@/database/schema";
import { SUPPORTED_CURRENCIES } from "@/shared/lib/constants/currencies";

// Define the pricing tier schema
export const pricingTierSchema = z.object({
  id: z.string().uuid("Invalid ID format").optional(), // Optional for new tiers
  hours: z.number().int().positive("Hours must be a positive number"),
  price: z.number().positive("Price must be a positive number"),
  /** What the owner is paid per trip, in dollars; bookings at this length copy it as the owner payout. */
  ownerRate: z.number().nonnegative("The owner's rate can't be negative").nullable().optional(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export type PricingTierInput = z.infer<typeof pricingTierSchema>;

// Per-boat add-on offering (which catalog add-on a boat offers, at what price)
const boatAddOnAssignmentSchema = z.object({
  id: z.string().uuid("Invalid ID format").optional(), // boat_add_on row id (omit for new)
  addOnId: z.string().uuid("Invalid add-on"),
  priceCents: z.number().int().min(0).nullable().optional(), // null = use catalog default
  isComplimentary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type BoatAddOnAssignmentInput = z.infer<typeof boatAddOnAssignmentSchema>;

// Common boat schema for shared fields between create and update
const boatBaseSchema = z.object({
  // Core Information
  name: z.string().min(2, "Boat name is required"),
  displayTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.enum(boatCategoryEnum.enumValues),
  active: z.boolean().default(false),
  featured: z.boolean().default(false),
  featuredOrder: z.number().int().nonnegative().optional().nullable(),
  
  // Owner Information
  ownerAccountId: z.string().uuid("Choose the owner"),
  ownerNotes: z.string().optional().nullable(),
  
  // Boat Specifications
  // Names, matched to the boat_make / boat_model catalog when the boat is saved.
  make: z.string().trim().max(60, "Keep the make under 60 characters").optional().nullable(),
  model: z.string().trim().max(60, "Keep the model under 60 characters").optional().nullable(),
  yearBuilt: z
    .number()
    .int()
    .min(1900, "Year must be >= 1900")
    .max(new Date().getFullYear(), "Year cannot be in the future")
    .optional()
    .nullable(),
  lengthFt: z.number().int().min(1, "Length must be at least 1 ft"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  bathrooms: z.number().int().nonnegative().optional().nullable(),
  showers: z.number().int().nonnegative().optional().nullable(),
  sleeps: z.number().int().nonnegative().optional().nullable(),
  range: z.number().int().nonnegative().optional().nullable(),
  
  // Features
  features: z.array(z.string()).min(1, "At least one feature is required"),
  safetyEquipment: z.array(z.string()).optional().nullable(),
  
  // Media (permissive URL validation for ImageKit and CDN URLs)
  mainImage: z.string().refine((v) => !v || v.startsWith("http"), "Must be a valid URL").optional().nullable(),
  galleryImages: z.array(z.string().refine((v) => !v || v.startsWith("http"), "Must be a valid URL")).optional().nullable(),
  
  // Pricing (tiers only)
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
  pricingTiers: z.array(pricingTierSchema).optional(),
  boatAddOns: z.array(boatAddOnAssignmentSchema).optional(),
  depositAmount: z.number().nonnegative().optional().nullable(),
  cleaningFee: z.number().nonnegative().optional().nullable(),
  
  // Location
  locationLabel: z.string().optional().nullable(),
  // Location coordinates for the map
  locationCoordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional().nullable(),
  // Explicitly skip the location field since it's a geometry type that won't be directly edited via form
  availableDestinations: z.array(z.string()).optional().nullable(),
  dockInfo: z.string().optional().nullable(),
  parkingInfo: z.string().optional().nullable(),
  
  // Charter Options
  crewRequired: z.boolean().default(true),
  crewIncluded: z.boolean().default(true),
  dayCharter: z.boolean().default(true),
  termCharter: z.boolean().default(false),
  minimumCharterDays: z.number().int().nonnegative().optional().nullable(),
  
  // Booking Options
  instantBook: z.boolean().default(false),
  
  // Fuel Details
  fuelIncluded: z.boolean().default(false),
  
  // Rules & Instructions
  rules: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  cancellationPolicy: z.string().optional().nullable(),
  
  // Documentation
  registrationNumber: z.string().optional().nullable(),
  hullId: z.string().optional().nullable(),
  insuranceInfo: z.string().optional().nullable(),
  insuranceExpiry: z.string().datetime().optional().nullable().or(z.literal("")),
  
  // Availability
  minRentalHours: z.number().int().nonnegative().optional().nullable(),
  advanceBookingDays: z.number().int().nonnegative().optional().nullable(),
});

// Schema for creating a new boat - all required fields must be present
export const createBoatSchema = boatBaseSchema;

// Schema for updating a boat - all fields are optional
export const updateBoatSchema = boatBaseSchema.partial();

/** Boat list filters — the admin boat list and the public search. */
export interface BoatFilterInput {
  page?: number;
  limit?: number;
  search?: string;
  category?: (typeof boatCategoryEnum.enumValues)[number];
  featured?: boolean;
  active?: boolean;
  ownerAccountId?: string;
  minPrice?: number;
  maxPrice?: number;
  minLength?: number;
  maxLength?: number;
  minCapacity?: number;
  maxCapacity?: number;
  minYear?: number;
  maxYear?: number;
  minSleeps?: number;
  minBathrooms?: number;
  locationLabel?: string;
  crewRequired?: boolean;
  instantBook?: boolean;
  dayCharter?: boolean;
  termCharter?: boolean;
}

export type CreateBoatInput = z.infer<typeof createBoatSchema>;
export type UpdateBoatInput = z.infer<typeof updateBoatSchema>;
