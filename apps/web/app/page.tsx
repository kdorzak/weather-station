"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography, Link } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";

import { useDashboardData } from "./lib/hooks/useDashboardData";
import { useWeather } from "./lib/hooks/useWeather";
import { useLocation } from "./lib/hooks/useLocation";
import { Skeleton } from "./components/Skeleton";
import { StationReadings } from "./components/station";
import { CurrentConditions, HourlyForecast, DailyForecast, AnalyticsDialog } from "./components/weather";
import { LocationSelector } from "./components/LocationSelector";

function LoadingState() {
  return (
    <Stack spacing={2}>
      <Skeleton height={200} />
      <Skeleton height={100} />
      <Skeleton height={150} />
    </Stack>
  );
}

function ErrorState({ error, onRetry, onLogout }: { error: string; onRetry: () => void; onLogout: () => void }) {
  return (
    <Paper sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h6" gutterBottom>
        Could not load data
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {error}
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button variant="contained" onClick={onRetry}>
          Retry
        </Button>
        <Button variant="outlined" onClick={onLogout}>
          Logout
        </Button>
      </Stack>
    </Paper>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { userEmail, data: stationData, loading: stationLoading, error: stationError, reload, logout } = useDashboardData();
  const {
    location,
    loading: locationLoading,
    error: locationError,
    permissionDenied,
    requestBrowserLocation,
    setFromSearch,
  } = useLocation();
  const { current, hourly, daily, loading: weatherLoading, error: weatherError } = useWeather(
    location.latitude,
    location.longitude
  );
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  useEffect(() => {
    if (!stationLoading && !userEmail) {
      router.replace("/login");
    }
  }, [stationLoading, userEmail, router]);

  if (stationLoading) {
    return <LoadingState />;
  }

  if (stationError && !stationData) {
    return <ErrorState error={stationError} onRetry={reload} onLogout={logout} />;
  }

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Weather Dashboard
          </Typography>
          <LocationSelector
            location={location}
            loading={locationLoading}
            error={locationError}
            permissionDenied={permissionDenied}
            onRequestBrowserLocation={requestBrowserLocation}
            onSelectLocation={setFromSearch}
          />
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            startIcon={<BarChartIcon />}
            onClick={() => setAnalyticsOpen(true)}
          >
            Analytics
          </Button>
          <Chip size="small" label={userEmail} variant="outlined" />
          <Button size="small" variant="text" onClick={logout}>
            Logout
          </Button>
        </Stack>
      </Box>

      {/* Main Content - Two Column Layout */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        {/* Left Column - Current Data */}
        <Box sx={{ flex: { xs: 1, md: "0 0 auto" }, width: { xs: "100%", md: "40%" } }}>
          <Stack spacing={2}>
            {/* Current Weather from Open-Meteo */}
            <CurrentConditions data={current} loading={weatherLoading} />

            {/* Station Readings */}
            <StationReadings data={stationData} loading={stationLoading} />
          </Stack>
        </Box>

        {/* Right Column - Forecasts */}
        <Box sx={{ flex: { xs: 1, md: "0 0 auto" }, width: { xs: "100%", md: "60%" } }}>
          <Stack spacing={2}>
            {/* 24-Hour Forecast */}
            <HourlyForecast data={hourly} loading={weatherLoading} />

            {/* 7-Day Forecast */}
            <DailyForecast data={daily} loading={weatherLoading} />
          </Stack>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Weather data: Open-Meteo · Location: 50.0155°N, 20.0163°E
          </Typography>
          <Link href="/about" style={{ textDecoration: "none" }}>
            <Typography variant="caption" color="primary">
              About this project →
            </Typography>
          </Link>
        </Stack>
      </Box>

      {/* Error Toast for Weather */}
      {weatherError && (
        <Paper sx={{ p: 2, bgcolor: "error.dark", color: "error.contrastText" }}>
          <Typography variant="body2">Weather data unavailable: {weatherError}</Typography>
        </Paper>
      )}

      {/* Analytics Dialog */}
      <AnalyticsDialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        latitude={location.latitude}
        longitude={location.longitude}
        locationName={location.name}
      />
    </Stack>
  );
}
