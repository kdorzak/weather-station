"use client";

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Chip,
  Stack,
  LinearProgress,
} from "@mui/material";
import { Skeleton } from "./Skeleton";
import { formatNumber } from "../lib/format";
import { useOpenMeteoCurrent } from "../lib/hooks/useOpenMeteo";

const WindDirectionLabel = ({ degrees }: { degrees: number }) => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return <span>{directions[index]}</span>;
};

const WindDirectionArrow = ({ degrees }: { degrees: number }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      transform: `rotate(${degrees}deg)`,
      fontSize: "1rem",
    }}
  >
    ↑
  </Box>
);

const MetricBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <LinearProgress
    variant="determinate"
    value={Math.min((value / max) * 100, 100)}
    sx={{
      height: 4,
      borderRadius: 2,
      bgcolor: "action.hover",
      mt: 0.5,
      "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 2 },
    }}
  />
);

export const CurrentWeather = () => {
  const { current, location, cached, loading, error } = useOpenMeteoCurrent();

  if (loading) {
    return (
      <Card>
        <CardHeader title="Current Weather" subheader="Loading..." />
        <CardContent>
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((k) => (
              <Grid item xs={6} key={k}>
                <Skeleton height={22} />
                <Skeleton height={16} style={{ marginTop: 8 }} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (error || !current) {
    return (
      <Card>
        <CardHeader title="Current Weather" subheader="External data" />
        <CardContent>
          <Typography color="error">
            {error ?? "Unable to load weather data"}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Current Weather"
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            <span>Open-Meteo</span>
            {cached && <Chip size="small" label="Cached" variant="outlined" />}
          </Stack>
        }
        action={
          <Typography variant="h3" component="span">
            {current.weather_icon}
          </Typography>
        }
      />
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h2" component="div" sx={{ fontWeight: 500 }}>
            {formatNumber(current.temperature, 1)}°C
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {current.weather_description}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Feels like {formatNumber(current.feels_like, 1)}°C
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Humidity
            </Typography>
            <Typography variant="h6">
              {formatNumber(current.humidity, 0)}%
            </Typography>
            <MetricBar value={current.humidity} max={100} color="#3b82f6" />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Pressure
            </Typography>
            <Typography variant="h6">
              {formatNumber(current.pressure, 1)} hPa
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Wind
            </Typography>
            <Typography variant="h6">
              {formatNumber(current.wind_speed, 1)} km/h{" "}
              <WindDirectionArrow degrees={current.wind_direction} />{" "}
              <WindDirectionLabel degrees={current.wind_direction} />
            </Typography>
            <MetricBar value={current.wind_speed} max={50} color="#22c55e" />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Cloud Cover
            </Typography>
            <Typography variant="h6">
              {formatNumber(current.cloud_cover, 0)}%
            </Typography>
            <MetricBar value={current.cloud_cover} max={100} color="#94a3b8" />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Wind Gusts
            </Typography>
            <Typography variant="h6">
              {formatNumber(current.wind_gusts, 1)} km/h
            </Typography>
            <MetricBar value={current.wind_gusts} max={80} color="#14b8a6" />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Precipitation
            </Typography>
            <Typography variant="h6">
              {formatNumber(current.precipitation, 1)} mm
            </Typography>
          </Grid>
        </Grid>

        {location && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
              {" · "}
              {location.elevation}m elevation
              {" · "}
              {location.timezone}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
