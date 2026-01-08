"use client";

import useSWR from "swr";
import {
  fetchOpenMeteoCurrent,
  fetchOpenMeteoForecast,
  OpenMeteoCurrentResponse,
  OpenMeteoForecastResponse,
} from "../api-client";

const DEFAULT_LAT = 50.01548560455507;
const DEFAULT_LON = 20.01632187262851;

export function useOpenMeteoCurrent(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  const { data, error, isLoading, mutate } = useSWR<OpenMeteoCurrentResponse>(
    `open-meteo-current-${lat}-${lon}`,
    () => fetchOpenMeteoCurrent(lat, lon),
    {
      revalidateOnFocus: false,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    current: data?.current ?? null,
    location: data?.location ?? null,
    cached: data?.cached ?? false,
    loading: isLoading,
    error: error?.message ?? null,
    reload: mutate,
  };
}

export function useOpenMeteoForecast(lat = DEFAULT_LAT, lon = DEFAULT_LON, days = 7) {
  const { data, error, isLoading, mutate } = useSWR<OpenMeteoForecastResponse>(
    `open-meteo-forecast-${lat}-${lon}-${days}`,
    () => fetchOpenMeteoForecast(lat, lon, days),
    {
      revalidateOnFocus: false,
      refreshInterval: 30 * 60 * 1000, // 30 minutes
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    hourly: data?.hourly ?? [],
    daily: data?.daily ?? [],
    location: data?.location ?? null,
    cached: data?.cached ?? false,
    loading: isLoading,
    error: error?.message ?? null,
    reload: mutate,
  };
}
