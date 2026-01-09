"use client";

import { useState, useEffect } from "react";
import { fetchMeteoAlarmAlerts, MeteoAlarmAlert, filterActiveAlerts } from "../alerts";

export function useWeatherAlerts(country: string = "poland", refreshInterval: number = 15 * 60 * 1000) {
  const [alerts, setAlerts] = useState<MeteoAlarmAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMeteoAlarmAlerts(country);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
      console.error("Error loading weather alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    
    if (refreshInterval > 0) {
      const interval = setInterval(loadAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [country, refreshInterval]);

  const activeAlerts = filterActiveAlerts(alerts);
  const hasActiveAlerts = activeAlerts.length > 0;

  return {
    alerts,
    activeAlerts,
    loading,
    error,
    hasActiveAlerts,
    refresh: loadAlerts,
  };
}
