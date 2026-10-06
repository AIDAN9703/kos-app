/**
 * Boat shapes, one per audience. The data layer (boat.data.ts) returns these
 * and nothing wider: the public never gets owner, insurance, registration,
 * maintenance or ranking fields, and only fleet managers see payouts.
 */

import { type Boat, type BoatPricingTier } from '@/database/types';
import { type ResolvedBoatAddOn } from '@/features/add-ons/add-on.types';

// ========================================
// PUBLIC (anyone, active boats only)
// ========================================

/** Boat columns anyone may see on a listing. Everything else stays internal. */
export const PUBLIC_BOAT_FIELDS = [
  'id',
  'name',
  'displayTitle',
  'description',
  'category',
  'capacity',
  'make',
  'model',
  'yearBuilt',
  'lengthFt',
  'bathrooms',
  'showers',
  'sleeps',
  'range',
  'features',
  'safetyEquipment',
  'mainImage',
  'galleryImages',
  'currency',
  'depositAmount',
  'cleaningFee',
  'locationLabel',
  'timezone',
  'availableDestinations',
  'dockInfo',
  'parkingInfo',
  'crewRequired',
  'crewIncluded',
  'dayCharter',
  'termCharter',
  'minimumCharterDays',
  'instantBook',
  'fuelIncluded',
  'rules',
  'specialInstructions',
  'cancellationPolicy',
  'minRentalHours',
  'advanceBookingDays',
] as const satisfies readonly (keyof Boat)[];

/** An active pricing tier: what a trip costs, never what the owner is paid. */
export type BoatTier = Pick<
  BoatPricingTier,
  'id' | 'boatId' | 'hours' | 'price' | 'name' | 'description' | 'isDefault'
>;

/** An add-on the boat currently offers, at its effective price. */
export type PublicBoatAddOn = Pick<
  ResolvedBoatAddOn,
  'id' | 'addOnId' | 'name' | 'description' | 'category' | 'priceCents' | 'isComplimentary' | 'imageUrl'
>;

/** The boat page and the booking flow. */
export type PublicBoat = Pick<Boat, (typeof PUBLIC_BOAT_FIELDS)[number]> & {
  pricingTiers: BoatTier[];
  boatAddOns: PublicBoatAddOn[];
};

/** A listing card: search results, the featured fleet, term charters. */
export type BoatCard = Pick<
  Boat,
  'id' | 'name' | 'displayTitle' | 'mainImage' | 'galleryImages' | 'locationLabel' | 'capacity' | 'instantBook'
> & {
  /** Lowest price per hour across active tiers; 0 when the boat has none. */
  startingHourlyRate: number;
};

/** A search map pin. */
export interface BoatLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  /** Starting price per hour. */
  price: number;
  imageUrl?: string;
  // For grouped markers
  count?: number;
  groupedBoats?: BoatLocation[];
}

// ========================================
// STAFF (boat:view — admins and brokers)
// ========================================

/** A boat in the staff pickers (booking composer, trip editor). */
export interface BoatForAdminSelect {
  id: string;
  name: string;
  mainImage: string | null;
  capacity: number;
  locationLabel: string | null;
  cleaningFee: number | null;
  depositAmount: number | null;
  crewRequired: boolean | null;
  /** Boat's IANA zone — trip times are entered and shown in the boat's local time. */
  timezone: string | null;
}

// ========================================
// FLEET MANAGEMENT (boat:edit — admins)
// ========================================

/** A row in the admin boats table. */
export type BoatListItem = Pick<
  Boat,
  | 'id'
  | 'name'
  | 'category'
  | 'capacity'
  | 'lengthFt'
  | 'active'
  | 'featured'
  | 'mainImage'
  | 'createdAt'
  | 'ownerId'
> & {
  ownerName?: string | null;
  basePrice?: number | null;
};

export interface PaginatedBoatsResponse {
  boats: BoatListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Everything about a boat: every column, all tiers with payouts, owner contact. */
export interface BoatDetail extends Boat {
  pricingTiers: BoatPricingTier[];
  /** Add-ons this boat offers (joined with the catalog), active or not. */
  boatAddOns: ResolvedBoatAddOn[];
  locationCoordinates: {
    lat: number;
    lng: number;
  } | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  ownerEmail: string | null;
}
