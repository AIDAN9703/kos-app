"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Input } from "./input";
import { Loader2 } from "lucide-react";
import { LocationData } from "@/shared/lib/types/types";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { debounce } from "@/shared/lib/utils/general-utils";
import { SUPPORTED_LOCATION_COUNTRIES } from "@/shared/lib/constants/map-constants";

interface CustomPlacesAutocompleteProps {
  onPlaceSelected: (locationData: LocationData) => void;
  onError?: (errorMessage: string) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  defaultValue?: string;
  countryRestriction?: string | string[];
  types?: string[];
  isOpen?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function CustomPlacesAutocomplete({
  onPlaceSelected,
  onError,
  placeholder = "Search location...",
  className = "",
  containerClassName = "",
  defaultValue = "",
  countryRestriction = [...SUPPORTED_LOCATION_COUNTRIES],
  types = ["geocode", "establishment"],
  isOpen = false,
  onFocus,
  onBlur,
}: CustomPlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if Google Maps API is loaded
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50;

    const checkGoogleMapsAvailability = () => {
      try {
        if (window.google?.maps?.places) {
          clearInterval(intervalId);
          setIsReady(true);

          try {
            autocompleteService.current = new google.maps.places.AutocompleteService();
            sessionToken.current = new google.maps.places.AutocompleteSessionToken();
            placesService.current = new google.maps.places.PlacesService(
              document.createElement("div")
            );
          } catch (error) {
            console.error("Error initializing Google Maps services:", error);
            if (onError) onError("Could not initialize location services.");
          }
        }
      } catch (error) {
        console.error("Error checking Google Maps API:", error);
      }
    };

    const intervalId = setInterval(() => {
      if (attempts > maxAttempts) {
        clearInterval(intervalId);
        if (onError) onError("Google Maps API could not be loaded. Please refresh the page.");
        return;
      }

      attempts++;
      checkGoogleMapsAvailability();
    }, 100);

    checkGoogleMapsAvailability();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [onError]);

  // Update input value if defaultValue changes
  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  const { clearSelectedPlace } = useSearchStore();

  // Fetch predictions with debouncing
  // One debounced fetcher for the component's lifetime.
  const fetchPredictions = useMemo(
    () =>
      debounce((input: string) => {
        if (!autocompleteService.current || input.length < 1 || !sessionToken.current) {
          setPredictions([]);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);

        try {
          autocompleteService.current.getPlacePredictions(
            {
              input,
              sessionToken: sessionToken.current,
              componentRestrictions: countryRestriction
                ? { country: countryRestriction }
                : undefined,
              types,
            },
            (predictions, status) => {
              setIsLoading(false);

              if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                setPredictions(predictions);
              } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setPredictions([]);
              } else {
                console.warn(`Places prediction error: ${status}`);
                setPredictions([]);
                if (
                  status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT ||
                  status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED
                ) {
                  if (onError)
                    onError("Location search temporarily unavailable. Please try again later.");
                }
              }
            }
          );
        } catch (error) {
          console.error("Error fetching place predictions:", error);
          setIsLoading(false);
          setPredictions([]);
          if (onError) onError("Location search failed. Please try again.");
        }
      }, 300),
    [countryRestriction, types, onError]
  );

  // Get place details
  const getPlaceDetails = useCallback(
    (placeId: string) => {
      if (!placesService.current) {
        if (onError) onError("Location service unavailable");
        return;
      }

      setIsLoading(true);

      try {
        placesService.current.getDetails(
          {
            placeId,
            fields: ["geometry", "formatted_address", "name", "place_id"],
          },
          (place, status) => {
            setIsLoading(false);

            sessionToken.current = new google.maps.places.AutocompleteSessionToken();

            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
              if (onError) onError("Error fetching place details");
              return;
            }

            if (!place.geometry?.location) {
              if (onError) onError("Location error: Could not get coordinates for this location");
              return;
            }

            if (!place.geometry.viewport) {
              if (onError)
                onError(
                  "This location doesn't have defined boundaries. Please try a different location."
                );
              return;
            }

            const vp = place.geometry.viewport;

            const locationData: LocationData = {
              formatted_address: place.formatted_address || "",
              coordinates: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
              bounds: {
                ne_lat: vp.getNorthEast().lat(),
                ne_lng: vp.getNorthEast().lng(),
                sw_lat: vp.getSouthWest().lat(),
                sw_lng: vp.getSouthWest().lng(),
              },
              place_id: place.place_id || "",
              name: place.name || "",
              raw: place,
              isValid: true,
            };

            setInputValue(place.formatted_address || "");
            setPredictions([]);
            onPlaceSelected(locationData);
          }
        );
      } catch (error) {
        console.error("Error fetching place details:", error);
        setIsLoading(false);
        if (onError) onError("Failed to fetch location details. Please try again.");
      }
    },
    [onError, onPlaceSelected]
  );

  // Event handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (value.length >= 1) {
        fetchPredictions(value);
      } else {
        setPredictions([]);
        setIsLoading(false);
        clearSelectedPlace();
      }
    },
    [fetchPredictions, clearSelectedPlace]
  );

  const handlePredictionSelect = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      getPlaceDetails(prediction.place_id);
    },
    [getPlaceDetails]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && isOpen && predictions.length > 0) {
        e.preventDefault();
        handlePredictionSelect(predictions[0]);
      }
    },
    [isOpen, predictions, handlePredictionSelect]
  );

  if (!isReady) {
    return (
      <div className={containerClassName}>
        <Input
          type="text"
          placeholder={placeholder}
          className={className}
          aria-label="Search for a location"
          value={defaultValue}
          disabled
        />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className={className}
        aria-label="Search for a location"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
      />

      {isLoading && inputValue.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}

      {isOpen && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-[10000]">
          <ul className="py-1">
            {predictions.map((prediction) => (
              <li
                key={prediction.place_id}
                className="px-4 py-2 text-left cursor-pointer hover:bg-light-main text-sm text-gray-900"
                onMouseDown={() => handlePredictionSelect(prediction)}
              >
                {prediction.description}
              </li>
            ))}
          </ul>
          <div className="py-1 px-4 text-right text-xs text-gray-500 border-t border-gray-200">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
