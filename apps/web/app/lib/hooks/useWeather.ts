"use client";

import useSWR from "swr";
import { fetchWeatherData, WeatherData } from "../open-meteo";

export function useWeather(lat: number, lon: number) {
  const { data, error, isLoading, mutate } = useSWR<WeatherData>(
    lat && lon ? `weather-${lat.toFixed(4)}-${lon.toFixed(4)}` : null,
    () => fetchWeatherData(lat, lon),
    {
      revalidateOnFocus: false,
      refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
      dedupingInterval: 5 * 60 * 1000, // Dedupe requests within 5 minutes
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    }
  );

  return {
    data,
    current: data?.current ?? null,
    hourly: data?.hourly ?? [],
    daily: data?.daily ?? [],
    location: data?.location ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    reload: () => mutate(),
  };
}
