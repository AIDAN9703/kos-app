/**
 * Application-level types for boats
 * These extend or derive from the base database types
 */

import { type Boat, type BoatPricingTier } from '@/database/types';
import { type ResolvedBoatAddOn } from '@/features/add-ons/add-on.types';

/**
 * Boat list item - optimized for table display
 */
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

/**
 * Boat data for admin dropdowns (draft bookings, bookings create forms)
 */
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

/**
 * Paginated boats response
 */
export interface PaginatedBoatsResponse {
  boats: BoatListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Boat with full details including pricing tiers
 */
export interface BoatWithTiers extends Boat {
  pricingTiers: BoatPricingTier[];
  /** Add-ons this boat offers (joined with the catalog). */
  boatAddOns?: ResolvedBoatAddOn[];
  locationCoordinates?: {
    lat: number;
    lng: number;
  } | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerEmail?: string | null;
}

// Location type for map markers
export interface BoatLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  price: number;
  imageUrl?: string;
  // For grouped markers
  count?: number;
  groupedBoats?: BoatLocation[];
}

