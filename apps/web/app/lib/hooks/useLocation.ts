"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GeoLocation,
  DEFAULT_LOCATION,
  getBrowserLocation,
  searchLocation,
  GeocodeResult,
} from "../geolocation";

const STORAGE_KEY = "weather_location";

export function useLocation() {
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Load saved location on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLocation(parsed);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save location when it changes
  const saveLocation = useCallback((loc: GeoLocation) => {
    setLocation(loc);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Request browser location
  const requestBrowserLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const browserLoc = await getBrowserLocation();

      // Try to get a name for the location via search
      const results = await searchLocation(
        `${browserLoc.latitude.toFixed(2)},${browserLoc.longitude.toFixed(2)}`
      );

      const loc: GeoLocation = {
        ...browserLoc,
        name: results[0]?.name ?? `${browserLoc.latitude.toFixed(4)}°N`,
        country: results[0]?.country ?? `${browserLoc.longitude.toFixed(4)}°E`,
      };

      saveLocation(loc);
      setPermissionDenied(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get location";
      setError(message);
      if (message.includes("denied")) {
        setPermissionDenied(true);
      }
    } finally {
      setLoading(false);
    }
  }, [saveLocation]);

  // Set location from search result
  const setFromSearch = useCallback(
    (result: GeocodeResult) => {
      saveLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
        country: result.country,
      });
    },
    [saveLocation]
  );

  // Reset to default
  const resetToDefault = useCallback(() => {
    saveLocation(DEFAULT_LOCATION);
  }, [saveLocation]);

  return {
    location,
    loading,
    error,
    permissionDenied,
    requestBrowserLocation,
    setFromSearch,
    resetToDefault,
    searchLocation,
  };
}
