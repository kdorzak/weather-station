"use client";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
  accuracy?: number;
}

export interface GeocodeResult {
  name: string;
  country: string;
  admin1?: string; // state/region
  latitude: number;
  longitude: number;
}

// Default location (Kraków area)
export const DEFAULT_LOCATION: GeoLocation = {
  latitude: 50.01548560455507,
  longitude: 20.01632187262851,
  name: "Kraków",
  country: "Poland",
};

export function getBrowserLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information unavailable"));
            break;
          case error.TIMEOUT:
            reject(new Error("Location request timed out"));
            break;
          default:
            reject(new Error("Unknown location error"));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000, // Cache for 5 minutes
      }
    );
  });
}

// Reverse geocode using Open-Meteo's geocoding API
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodeResult | null> {
  try {
    // Open-Meteo doesn't have reverse geocoding, so we use a simple approach
    // with their search API by searching for coordinates
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${latitude.toFixed(2)},${longitude.toFixed(2)}&count=1&language=en&format=json`
    );

    // If that doesn't work well, we'll just use coordinates as the name
    // In a production app, you'd use a proper reverse geocoding service
    return {
      name: `${latitude.toFixed(4)}°N`,
      country: `${longitude.toFixed(4)}°E`,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

// Forward geocode - search for a location by name
export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.results) return [];

    return data.results.map((r: any) => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch {
    return [];
  }
}
