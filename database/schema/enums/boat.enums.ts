import { pgEnum } from "drizzle-orm/pg-core";



export const boatCategoryEnum = pgEnum("BoatCategory", [
    "PONTOON",
    "YACHT",
    "SAILBOAT",
    "FISHING",
    "SPEEDBOAT",
    "HOUSEBOAT",
    "JET_SKI",
    "OTHER"
  ]);

  // Timezone enum - Major IANA timezone identifiers
export const timezoneEnum = pgEnum('timezone', [
  // Major US Timezones
  'America/New_York',      // Eastern Time (ET) - covers Pittsburgh, Miami, Connecticut, etc.
  'America/Chicago',       // Central Time (CT) - covers Great Lakes, Texas Gulf, etc.
  'America/Denver',        // Mountain Time (MT) - covers Colorado, Utah, etc.
  'America/Los_Angeles',   // Pacific Time (PT) - covers California, Oregon, Washington
  'America/Phoenix',       // Arizona (no DST)
  'America/Anchorage',     // Alaska Time (AKT)
  'Pacific/Honolulu',      // Hawaii-Aleutian Time (HAT)
  
  // Caribbean & Popular International
  'America/Nassau',        // Bahamas
  'America/Jamaica',       // Jamaica  
  'America/Santo_Domingo', // Dominican Republic
  'America/Barbados',      // Eastern Caribbean
  'America/Cancun',        // Mexico Caribbean coast
  
  // Europe & Asia — international fleet (Mykonos, Singapore)
  'Europe/Athens',         // Greece (Mykonos)
  'Asia/Singapore',        // Singapore

  // Canada Major Zones
  'America/Toronto',       // Eastern Canada
  'America/Vancouver',     // Pacific Canada
]);
/**
 * Where a boat's listing is in review. Admin-made boats start APPROVED; a boat
 * an owner lists themselves starts as a DRAFT and needs a KOS review before
 * it can go live (boat.active only when APPROVED; a check constraint holds it).
 */
export const boatListingStatusEnum = pgEnum("BoatListingStatus", [
  "DRAFT",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
]);

/** Who runs the listing: the KOS team (concierge) or the owner (self-listed). */
export const boatManagedByEnum = pgEnum("BoatManagedBy", ["KOS", "OWNER"]);
