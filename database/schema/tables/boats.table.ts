import { pgTable, text, integer, boolean, doublePrecision, uuid, timestamp, index, geometry } from "drizzle-orm/pg-core";
import { boatCategoryEnum, timezoneEnum } from "@/database/schema/enums";
import { users } from "@/database/schema/tables";


export const boats = pgTable("boat",{
    // Core Information
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    name: text("name").notNull(),
    displayTitle: text("display_title"),
    description: text("description"),
    category: boatCategoryEnum("category").notNull(),
    capacity: integer("capacity").notNull(), // Renamed from numOfPassengers
    active: boolean("active").default(false).notNull(),
    featured: boolean("featured").default(false),
    featuredOrder: integer("featured_order"), // Order for featured fleet display (lower = higher priority)
    searchRankingScore: doublePrecision("search_ranking_score").default(0), // For advanced search algorithms
    
    // Owner Information
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "restrict" }), // Can't delete user if owns boats
    ownerNotes: text("owner_notes"), // Added owner notes for internal use
    
    // Boat Specifications
    make: text("make"),
    model: text("model"),
    yearBuilt: integer("year_built"),
    lengthFt: integer("length_ft").notNull(),
    bathrooms: integer("bathrooms"),         // Renamed from numOfBathrooms
    showers: integer("showers"),             // Renamed from numOfShowers
    sleeps: integer("sleeps"),               // Renamed from sleepsNum
    range: integer("range"),                 // Nautical miles at cruising speed
    
    // Features
    features: text("features").array().notNull(),
    safetyEquipment: text("safety_equipment").array(), // Added safety equipment
    
    // Media
    mainImage: text("main_image"),           // Renamed from primaryPhoto
    galleryImages: text("gallery_images").array(), // Renamed from galleryPhotos
    virtualTourUrl: text("virtual_tour_url"),
    
    // Pricing (all pricing now driven by tiers; weekly/monthly remain optional)
    // `currency` is the ISO 4217 code (e.g. "USD", "EUR") used for all tier
    // prices, fees, and downstream booking_pricing/payment records for this boat.
    currency: text("currency").default("USD").notNull(),
    weeklyRate: doublePrecision("weekly_rate"),
    monthlyRate: doublePrecision("monthly_rate"),
    depositAmount: doublePrecision("deposit_amount"),
    cleaningFee: doublePrecision("cleaning_fee"), // Added cleaning fee
    
    // Location
    locationLabel: text("location_label"), // Human-readable label for the geo point
    location: geometry('location', { type: 'point', srid: 4326 }),
    timezone: timezoneEnum("timezone"), // IANA timezone identifier
    availableDestinations: text("available_destinations").array(),
    dockInfo: text("dock_info"),
    parkingInfo: text("parking_info"),        // Renamed from parkingNotes
    
    // Charter Options
    crewRequired: boolean("crew_required").default(true).notNull(),
    crewIncluded: boolean("crew_included").default(true).notNull(),
    primaryCaptainUserId: uuid("primary_captain_user_id").references(() => users.id, { onDelete: "set null" }), // Direct reference to user (who has captain_profile)
    dayCharter: boolean("day_charter").default(true).notNull(),
    termCharter: boolean("term_charter").default(false).notNull(),
    minimumCharterDays: integer("minimum_charter_days"),
    
    // Booking Options
    instantBook: boolean("instant_book").default(false).notNull(),
    /**
     * Turnaround time between charters (cleaning, refuel, crew change) in
     * minutes. Availability treats a trip as occupying [start − turnaround,
     * end + turnaround] — back-to-back bookings must clear this gap.
     * 30 by team decision (2026-10-07); 60 blocked normal back-to-back days.
     */
    turnaroundMinutes: integer("turnaround_minutes").default(30).notNull(),
    
    // Fuel Details
    fuelIncluded: boolean("fuel_included").default(false).notNull(),
    
    // Rules & Instructions
    rules: text("rules"),                     // Renamed from instructionsAndRules
    specialInstructions: text("special_instructions"),
    cancellationPolicy: text("cancellation_policy"), // Added cancellation policy
    
    // Documentation
    registrationNumber: text("registration_number"),
    hullId: text("hull_id"),
    insuranceInfo: text("insurance_info"),    // Simplified insurance fields
    insuranceExpiry: timestamp("insurance_expiry", { mode: "date", withTimezone: true }),
    
    // Availability
    minRentalHours: integer("min_rental_hours"), // Added minimum rental hours
    maxRentalDays: integer("max_rental_days"),   // Added maximum rental days
    advanceBookingDays: integer("advance_booking_days"), // Added advance booking days
    
    // Maintenance
    lastMaintenanceDate: timestamp("last_maintenance_date", { mode: "date", withTimezone: true }),
    nextMaintenanceDate: timestamp("next_maintenance_date", { mode: "date", withTimezone: true }),
    maintenanceNotes: text("maintenance_notes"), // Added maintenance notes

    averageRating: doublePrecision("average_rating"),
    totalReviews: integer("total_reviews").default(0),
    
    // Timestamps
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("boat_owner_idx").on(table.ownerId),
    index("boat_captain_idx").on(table.primaryCaptainUserId),
    index("boat_category_idx").on(table.category),
    index("boat_spatial_idx").using("gist", table.location),
    index("boat_featured_idx").on(table.featured, table.featuredOrder), // For featured fleet queries
    index("boat_ranking_idx").on(table.searchRankingScore), // For search ranking queries
    // Search-specific indexes
    index("boat_search_name_idx").on(table.name),
    index("boat_search_make_model_idx").on(table.make, table.model),
  ]
);