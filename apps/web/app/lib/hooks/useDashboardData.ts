"use client";

import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { fetchChartData, fetchMe as fetchMeApi, logout as logoutApi } from "../api-client";

type ChartPoint = { ts: string; value: number };
type ChartSeries = { metric: string; label: string; unit: string; data: ChartPoint[] };

export type DashboardData = {
  device_id: string;
  updated_at: string;
  series: ChartSeries[];
};

export function useDashboardData() {
  const {
    data: me,
    error: meError,
    isLoading: meLoading,
    mutate: mutateMe,
  } = useSWRImmutable("auth/me", () => fetchMeApi(), { shouldRetryOnError: false });

  const chartKey = me && me.status === "ok" ? "chart-data" : null;
  const {
    data: chart,
    error: chartError,
    isLoading: chartLoading,
    mutate: mutateChart,
  } = useSWR<DashboardData>(chartKey, () => fetchChartData(), {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
  });

  const userEmail = me && me.status === "ok" ? me.user.email : null;
  const loading = meLoading || (me?.status === "ok" && chartLoading);
  const error =
    meError?.message ??
    (chartError instanceof Error ? chartError.message : chartError ? "Failed to load data" : null);

  const reload = async () => {
    await mutateMe();
    if (chartKey) {
      await mutateChart();
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      /* ignore */
    }
    await mutateMe(undefined, { revalidate: false });
    await mutateChart(undefined, { revalidate: false });
  };

  return {
    userEmail,
    data: chart ?? null,
    loading,
    error,
    reload,
    logout,
  };
}
