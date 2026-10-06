import type { BoatCard, BoatLocation } from "@/features/boats/boat.types";
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
  boats: BoatCard[];
  totalCount: number;
  totalPages: number;
  locations: BoatLocation[]; 
}

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  /** What to tell the person on success (toast text). */
  message?: string;
  /** Per-field messages for inline forms (InvalidFields). */
  fieldErrors?: Record<string, string[]>;
};

 
