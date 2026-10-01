"use client";

import { useState, useEffect, useCallback } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { BoatLocation } from "@/shared/lib/types/types";
import { Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import BoatMapMarker from "./MapMarker";
import {
  DEFAULT_US_BOUNDS,
  DEFAULT_US_CENTER,
  DEFAULT_US_ZOOM,
  MAP_RESTRICTIONS,
} from "@/shared/lib/constants/map-constants";

interface SearchMapProps {
  locations: BoatLocation[];
  boundingBox?: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
}

// Inner component to use map instance
function MapContent({
  locations,
  boundingBox,
}: {
  locations: BoatLocation[];
  boundingBox?: SearchMapProps["boundingBox"];
}) {
  const map = useMap();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapMoved, setMapMoved] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<{
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  } | null>(null);

  // State to track currently active info window
  const [activeInfoWindowId, setActiveInfoWindowId] = useState<string | null>(null);

  // Function to handle info window activation
  const handleInfoWindowToggle = useCallback((locationId: string, isOpen: boolean) => {
    setActiveInfoWindowId(isOpen ? locationId : null);
  }, []);

  // Track when map bounds change
  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const handleBoundsChanged = () => {
      if (!map) return;

      const bounds = map.getBounds();
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      // Show search button when map is moved
      setMapMoved(true);

      // Save current bounds for search
      setCurrentBounds({
        ne: { lat: ne.lat(), lng: ne.lng() },
        sw: { lat: sw.lat(), lng: sw.lng() },
      });
    };

    // Listen for bounds changed events
    map.addListener("bounds_changed", handleBoundsChanged);

    return () => {
      if (map) {
        google.maps.event.clearListeners(map, "bounds_changed");
      }
    };
  }, [map]);

  // Add click handler to close InfoWindows when clicking on the map
  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const handleMapClick = () => {
      setActiveInfoWindowId(null);
    };

    map.addListener("click", handleMapClick);

    return () => {
      if (map) {
        google.maps.event.clearListeners(map, "click");
      }
    };
  }, [map]);

  // Handle search this area button click
  const handleSearchThisArea = useCallback(() => {
    if (!currentBounds) return;

    // Create a new URLSearchParams object based on the current URL
    const newParams = new URLSearchParams(searchParams.toString());

    // Save bounds for API filtering
    newParams.set("ne_lat", currentBounds.ne.lat.toString());
    newParams.set("ne_lng", currentBounds.ne.lng.toString());
    newParams.set("sw_lat", currentBounds.sw.lat.toString());
    newParams.set("sw_lng", currentBounds.sw.lng.toString());

    // Reset to page 1
    newParams.set("page", "1");

    // Hide search button until next map movement
    setMapMoved(false);

    // Navigate to the new URL
    router.push(`/boats/search?${newParams.toString()}`);
  }, [currentBounds, router, searchParams]);

  // Initialize map view when map and data are ready
  useEffect(() => {
    // Wait for map instance and google global to be available
    if (!map || typeof google === "undefined") {
      return;
    }

    try {
      // Calculate proper bounds
      let bounds: google.maps.LatLngBounds;

      if (boundingBox) {
        // Use bounds from URL parameters
        bounds = new google.maps.LatLngBounds(
          { lat: boundingBox.sw.lat, lng: boundingBox.sw.lng },
          { lat: boundingBox.ne.lat, lng: boundingBox.ne.lng }
        );
        setCurrentBounds(boundingBox);
      } else if (locations.length > 0) {
        // Create bounds from boat locations
        bounds = new google.maps.LatLngBounds();
        locations.forEach((location) => {
          bounds.extend({ lat: location.latitude, lng: location.longitude });
        });
      } else {
        // Default to US bounds if no locations or bounds
        bounds = new google.maps.LatLngBounds(
          { lat: DEFAULT_US_BOUNDS.sw.lat, lng: DEFAULT_US_BOUNDS.sw.lng },
          { lat: DEFAULT_US_BOUNDS.ne.lat, lng: DEFAULT_US_BOUNDS.ne.lng }
        );
      }

      // Fit map to calculated bounds with padding
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, [map, locations, boundingBox]);

  return (
    <>
      {/* No locations message */}
      {locations.length === 0 && (
        <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-sm z-10 text-sm">
          No boats found in this area
        </div>
      )}

      {/* Search this area button - show when map has been moved */}
      {mapMoved && (
        <div className="absolute bottom-8 left-2 flex justify-center z-10">
          <Button
            onClick={handleSearchThisArea}
            variant="outline"
            className="bg-white hover:bg-gray-50 text-primary border-gray-200 shadow-md flex items-center gap-2 py-2 px-4 rounded-2xl"
          >
            <Search className="h-4 w-4" />
            Search this area
          </Button>
        </div>
      )}

      {/* Render all boat markers */}
      {locations.map((location) => (
        <BoatMapMarker
          key={location.id}
          location={location}
          isActive={activeInfoWindowId === location.id}
          onToggleInfoWindow={handleInfoWindowToggle}
        />
      ))}
    </>
  );
}

export default function VisGLSearchMap({ locations = [], boundingBox }: SearchMapProps) {
  return (
    <APIProvider apiKey="">
      <Map
        mapId="20b5a35bbeb964a1"
        colorScheme="LIGHT"
        gestureHandling="cooperative"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={false}
        scaleControl={false}
        streetViewControl={false}
        rotateControl={false}
        fullscreenControl={true}
        clickableIcons={false}
        cameraControl={false}
        defaultCenter={DEFAULT_US_CENTER}
        defaultZoom={DEFAULT_US_ZOOM}
        minZoom={3}
        maxZoom={15}
        restriction={MAP_RESTRICTIONS}
        className="w-full h-full"
      >
        <MapContent locations={locations} boundingBox={boundingBox} />
      </Map>
    </APIProvider>
  );
}
