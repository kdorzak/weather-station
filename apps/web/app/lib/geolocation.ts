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
    // Use Nominatim reverse geocoding (OpenStreetMap)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error("Reverse geocode failed");
    }

    const data = await response.json();
    const address = data.address || {};
    return {
      name:
        address.road && address.house_number
          ? `${address.road} ${address.house_number}`
          : data.display_name?.split(",")[0] ?? `${latitude.toFixed(4)}°N`,
      country: address.country || "",
      admin1: address.state || address.region || "",
      latitude,
      longitude,
    };
  } catch {
    return {
      name: `${latitude.toFixed(4)}°N`,
      country: `${longitude.toFixed(4)}°E`,
      latitude,
      longitude,
    };
  }
}

// Forward geocode - search for a location by name
export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  if (!query || query.length < 2) return [];

  try {
    // Try Open-Meteo first
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results.map((r: any) => ({
          name: r.name,
          country: r.country,
          admin1: r.admin1,
          latitude: r.latitude,
          longitude: r.longitude,
        }));
      }
    }

    // Fallback to Nominatim (OpenStreetMap) for more detailed addresses
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
    );

    if (!nominatimResponse.ok) return [];

    const nominatimData = await nominatimResponse.json();

    return nominatimData.map((r: any) => {
      const address = r.address || {};
      return {
        name: r.display_name.split(",")[0],
        country: address.country || "",
        admin1: address.state || address.region || "",
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      };
    });
  } catch {
    return [];
  }
}
