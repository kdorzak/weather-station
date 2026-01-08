"use client";

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Skeleton } from "./Skeleton";
import { formatNumber } from "../lib/format";
import { useOpenMeteoForecast } from "../lib/hooks/useOpenMeteo";

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const formatSunTime = (timeStr: string) => {
  const date = new Date(timeStr);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

export const DailyForecast = () => {
  const { daily, cached, loading, error } = useOpenMeteoForecast();

  if (loading) {
    return (
      <Card>
        <CardHeader title="7-Day Forecast" subheader="Loading..." />
        <CardContent>
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} height={48} style={{ marginBottom: 8 }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || daily.length === 0) {
    return (
      <Card>
        <CardHeader title="7-Day Forecast" />
        <CardContent>
          <Typography color="error">
            {error ?? "Unable to load forecast data"}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="7-Day Forecast"
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            <span>Open-Meteo</span>
            {cached && <Chip size="small" label="Cached" variant="outlined" />}
          </Stack>
        }
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Day</TableCell>
              <TableCell align="center">Weather</TableCell>
              <TableCell align="right">High</TableCell>
              <TableCell align="right">Low</TableCell>
              <TableCell align="right">Precip</TableCell>
              <TableCell align="right">Wind</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {daily.map((day) => (
              <TableRow key={day.date}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(day.date)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <span style={{ fontSize: "1.25rem" }}>{day.weather_icon}</span>
                    <Typography variant="caption" sx={{ display: { xs: "none", md: "inline" } }}>
                      {day.weather_description}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>
                    {formatNumber(day.temperature_max, 0)}°
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatNumber(day.temperature_min, 0)}°
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {day.precipitation_probability}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatNumber(day.wind_speed_max, 0)} km/h
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const HourlyForecast = () => {
  const { hourly, cached, loading, error } = useOpenMeteoForecast();

  if (loading) {
    return (
      <Card>
        <CardHeader title="24-Hour Forecast" subheader="Loading..." />
        <CardContent>
          <Skeleton height={120} />
        </CardContent>
      </Card>
    );
  }

  if (error || hourly.length === 0) {
    return (
      <Card>
        <CardHeader title="24-Hour Forecast" />
        <CardContent>
          <Typography color="error">
            {error ?? "Unable to load hourly forecast"}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Show every 3 hours for cleaner display
  const filteredHourly = hourly.filter((_, i) => i % 3 === 0);

  return (
    <Card>
      <CardHeader
        title="24-Hour Forecast"
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            <span>Open-Meteo</span>
            {cached && <Chip size="small" label="Cached" variant="outlined" />}
          </Stack>
        }
      />
      <Divider />
      <CardContent sx={{ overflowX: "auto" }}>
        <Stack direction="row" spacing={2} sx={{ minWidth: "max-content" }}>
          {filteredHourly.map((hour) => (
            <Box
              key={hour.time}
              sx={{
                textAlign: "center",
                minWidth: 70,
                p: 1,
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatTime(hour.time)}
              </Typography>
              <Box sx={{ fontSize: "1.5rem", my: 0.5 }}>{hour.weather_icon}</Box>
              <Typography variant="body2" fontWeight={600}>
                {formatNumber(hour.temperature, 0)}°
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {hour.precipitation_probability}% 💧
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {formatNumber(hour.wind_speed, 0)} km/h
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
