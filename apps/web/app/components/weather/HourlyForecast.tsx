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

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary" textTransform="uppercase" sx={{ mb: 1, display: "block" }}>
        24-Hour Forecast
      </Typography>

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
              💧{hour.precipitationProbability}%
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
