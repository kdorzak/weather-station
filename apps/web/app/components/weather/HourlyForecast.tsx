"use client";

import { Box, Paper, Typography, Stack } from "@mui/material";
import { HourlyForecast as HourlyData } from "../../lib/open-meteo";
import { formatNumber } from "../../lib/format";

interface Props {
  data: HourlyData[];
  loading?: boolean;
}

const formatTime = (time: string) => {
  const date = new Date(time);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

export function HourlyForecast({ data, loading }: Props) {
  if (loading || data.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Loading forecast...</Typography>
      </Paper>
    );
  }

  // Show every 3 hours for cleaner display (8 items for 24h)
  const filtered = data.filter((_, i) => i % 3 === 0).slice(0, 8);
  const willRain = data.some((h) => h.precipitationProbability > 30 || h.precipitation > 0);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase">
          24-Hour Forecast
        </Typography>
        {willRain && (
          <Typography variant="caption" color="primary" fontWeight={600}>
            Rain expected in next 24h
          </Typography>
        )}
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          overflowX: "auto",
          pb: 1,
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
        }}
      >
        {filtered.map((hour) => (
          <Box
            key={hour.time}
            sx={{
              textAlign: "center",
              minWidth: 64,
              p: 1,
              borderRadius: 1,
              bgcolor: "action.hover",
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {formatTime(hour.time)}
            </Typography>
            <Box sx={{ fontSize: "1.5rem", my: 0.5 }}>{hour.weatherIcon}</Box>
            <Typography variant="body2" fontWeight={600}>
              {formatNumber(hour.temperature, 0)}°
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              💧{hour.precipitationProbability}% · {formatNumber(hour.precipitation, 1)} mm
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
