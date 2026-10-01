// Location data for map and search
import { BoatWithTiers, BoatLocation } from "@/features/boats/boat.types";
// Re-export database types for convenience (backward compatibility)
export type { Boat } from "@/database/types";
export type { BoatLocation } from "@/features/boats/boat.types";

export interface LocationData {
  formatted_address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  viewport?: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
  bounds?: {
    ne_lat: number;
    ne_lng: number;
    sw_lat: number;
    sw_lng: number;
  };
  place_id: string;
  name: string;
  raw: google.maps.places.PlaceResult;
  isValid: boolean;
}

// Define the Pricing Tier type separately for clarity
export interface PricingTier {
  id: string;
  boatId: string;
  hours: number;
  price: number;
  name?: string | null;
  description?: string | null;
  isActive: boolean;
  isDefault?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

// Search params type for filtering boats
export type SearchParamsType = {
  [key: string]: string | string[] | undefined;
  category?: string | string[];
  minPrice?: string;
  maxPrice?: string;
  minLength?: string;
  maxLength?: string;
  passengers?: string;
  location?: string;
  date?: string;
  page?: string;
  sort?: string;
  features?: string | string[];
  amenities?: string | string[];
};

// Search results type
export interface SearchResults {
  boats: BoatWithTiers[];
  totalCount: number;
  totalPages: number;
  locations: BoatLocation[]; 
}

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

 
