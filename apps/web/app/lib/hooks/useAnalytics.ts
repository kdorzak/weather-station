"use client";

import { useState, useEffect } from "react";
import { fetchAnalyticsData, AnalyticsData } from "../analytics";

export function useAnalytics(
  latitude: number,
  longitude: number,
  days: number = 3,
  pastDays: number = 1
) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!latitude || !longitude) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await fetchAnalyticsData(latitude, longitude, days, pastDays);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch analytics data";
      setError(errorMessage);
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [latitude, longitude, days, pastDays]);

  return {
    data,
    loading,
    error,
    refresh: loadData,
  };
}
