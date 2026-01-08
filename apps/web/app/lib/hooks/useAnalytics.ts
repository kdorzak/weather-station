"use client";

import useSWR from "swr";
import {
  fetchOpenMeteoAnalytics,
  OpenMeteoAnalyticsResponse,
} from "../api-client";

const DEFAULT_LAT = 50.01548560455507;
const DEFAULT_LON = 20.01632187262851;

export function useAnalytics(
  lat = DEFAULT_LAT,
  lon = DEFAULT_LON,
  days = 7,
  pastDays = 2
) {
  const { data, error, isLoading, mutate } = useSWR<OpenMeteoAnalyticsResponse>(
    `analytics-${lat}-${lon}-${days}-${pastDays}`,
    () => fetchOpenMeteoAnalytics(lat, lon, days, pastDays),
    {
      revalidateOnFocus: false,
      refreshInterval: 15 * 60 * 1000, // 15 minutes
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    data: data ?? null,
    summary: data?.summary ?? null,
    hourly: data?.hourly ?? [],
    daily: data?.daily ?? [],
    location: data?.location ?? null,
    units: data?.units ?? {},
    cached: data?.cached ?? false,
    loading: isLoading,
    error: error?.message ?? null,
    reload: mutate,
  };
}
