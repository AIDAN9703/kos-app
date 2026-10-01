import * as z from "zod";
import { boatCategoryEnum } from "@/database/schema";
import { SUPPORTED_CURRENCIES } from "@/shared/lib/constants/currencies";

// Define the pricing tier schema
export const pricingTierSchema = z.object({
  id: z.string().uuid("Invalid ID format").optional(), // Optional for new tiers
  hours: z.number().int().positive("Hours must be a positive number"),
  price: z.number().positive("Price must be a positive number"),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export type PricingTierInput = z.infer<typeof pricingTierSchema>;

// Per-boat add-on offering (which catalog add-on a boat offers, at what price)
export const boatAddOnAssignmentSchema = z.object({
  id: z.string().uuid("Invalid ID format").optional(), // boat_add_on row id (omit for new)
  addOnId: z.string().uuid("Invalid add-on"),
  priceCents: z.number().int().min(0).nullable().optional(), // null = use catalog default
  isComplimentary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type BoatAddOnAssignmentInput = z.infer<typeof boatAddOnAssignmentSchema>;

// Common boat schema for shared fields between create and update
export const boatBaseSchema = z.object({
  // Core Information
  name: z.string().min(2, "Boat name is required"),
  displayTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.enum(boatCategoryEnum.enumValues),
  active: z.boolean().default(false),
  featured: z.boolean().default(false),
  featuredOrder: z.number().int().nonnegative().optional().nullable(),
  searchRankingScore: z.number().nonnegative().optional().nullable(),
  
  // Owner Information
  ownerId: z.string().uuid("Please select an owner"),
  ownerNotes: z.string().optional().nullable(),
  
  // Boat Specifications
  make: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
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
  virtualTourUrl: z.string().refine((v) => !v || v.startsWith("http"), "Must be a valid URL").optional().nullable(),
  
  // Pricing (tiers only)
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
  pricingTiers: z.array(pricingTierSchema).optional(),
  boatAddOns: z.array(boatAddOnAssignmentSchema).optional(),
  weeklyRate: z.number().positive().optional().nullable(),
  monthlyRate: z.number().positive().optional().nullable(),
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
  primaryCaptainUserId: z.string().uuid("Invalid captain user ID format").optional().nullable(),
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
  maxRentalDays: z.number().int().nonnegative().optional().nullable(),
  advanceBookingDays: z.number().int().nonnegative().optional().nullable(),
  
  // Maintenance
  lastMaintenanceDate: z.string().datetime().optional().nullable().or(z.literal("")),
  nextMaintenanceDate: z.string().datetime().optional().nullable().or(z.literal("")),
  maintenanceNotes: z.string().optional().nullable(),
});

// Schema for creating a new boat - all required fields must be present
export const createBoatSchema = boatBaseSchema;

// Schema for updating a boat - all fields are optional
export const updateBoatSchema = boatBaseSchema.partial();

// Boat filter/search schema for URL params - Comprehensive filters for admin
export const boatFilterSchema = z.object({
  // Pagination
  page: z.coerce.number().optional(),
  limit: z.coerce.number().max(1000).optional(), // Increased for admin dropdowns that need all boats
  
  // Text search
  search: z.string().optional(),
  
  // Basic filters
  category: z.enum(boatCategoryEnum.enumValues).optional(),
  featured: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  ownerId: z.string().uuid("Invalid owner ID").optional(),
  
  // Price range
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  
  // Size/capacity filters
  minLength: z.coerce.number().min(0).optional(),
  maxLength: z.coerce.number().min(0).optional(),
  minCapacity: z.coerce.number().min(0).optional(),
  maxCapacity: z.coerce.number().min(0).optional(),
  
  // Year built
  minYear: z.coerce.number().min(1900).optional(),
  maxYear: z.coerce.number().max(new Date().getFullYear()).optional(),
  
  // Accommodations
  minSleeps: z.coerce.number().min(0).optional(),
  minBathrooms: z.coerce.number().min(0).optional(),
  
  // Location
  locationLabel: z.string().optional(),
  
  // Charter options
  crewRequired: z.coerce.boolean().optional(),
  instantBook: z.coerce.boolean().optional(),
  dayCharter: z.coerce.boolean().optional(),
  termCharter: z.coerce.boolean().optional(),
});


export type CreateBoatInput = z.infer<typeof createBoatSchema>;
export type UpdateBoatInput = z.infer<typeof updateBoatSchema>;
export type BoatFilterInput = z.infer<typeof boatFilterSchema>;
