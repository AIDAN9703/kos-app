/**
 * Map constants used throughout the application
 */

/** ISO 3166-1 alpha-2 codes passed to Google Places componentRestrictions. */
export const SUPPORTED_LOCATION_COUNTRIES = [
  "us",
  "bs",
  "pr",
  "do",
  "gr",
] as const;

// Default US bounds for map initialization
export const DEFAULT_US_BOUNDS = {
  ne: { lat: 48.07631048724108, lng: -66.41625985304204 },
  sw: { lat: 21.000000000000018, lng: -88.69653329054204 }
};

// Default US viewport center
export const DEFAULT_US_CENTER = { 
  lat: 35.67299725018489, 
  lng: -77.55639657179204 
};

// Default zoom level for US view
export const DEFAULT_US_ZOOM = 5;

// Restriction bounds for the map (prevents scrolling too far off valid land)
export const MAP_RESTRICTIONS = {
  latLngBounds: {
    north: 85,
    south: -85,
    east: 180,
    west: -180,
  },
  strictBounds: true,
}; 