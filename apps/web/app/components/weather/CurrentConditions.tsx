"use client";

import { Box, Paper, Typography, Stack, IconButton, Collapse } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState } from "react";
import { CurrentWeather } from "../../lib/open-meteo";
import { formatNumber } from "../../lib/format";

interface Props {
  data: CurrentWeather | null;
  loading?: boolean;
}

const WindDirection = ({ degrees }: { degrees: number }) => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return <span>{directions[index]}</span>;
};

export function CurrentConditions({ data, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (loading || !data) {
    return (
      <Paper sx={{ p: 3, height: "100%" }}>
        <Typography color="text.secondary">Loading weather...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: "100%" }}>
      {/* Main Display */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase">
            Current Weather
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h2" fontWeight={500}>
              {formatNumber(data.temperature, 1)}°
            </Typography>
            <Typography variant="h4">{data.weatherIcon}</Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary">
            {data.weatherDescription}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Feels like {formatNumber(data.feelsLike, 1)}°C
          </Typography>
        </Box>

        <Stack alignItems="flex-end" spacing={0.5}>
          <Typography variant="body2">
            💧 {formatNumber(data.humidity, 0)}%
          </Typography>
          <Typography variant="body2">
            💨 {formatNumber(data.windSpeed, 0)} km/h <WindDirection degrees={data.windDirection} />
          </Typography>
        </Stack>
      </Stack>

      {/* Expand Button */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={2}
          sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}
        >
          <Box sx={{ minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary">
              Pressure
            </Typography>
            <Typography variant="body1">{formatNumber(data.pressure, 0)} hPa</Typography>
          </Box>
          <Box sx={{ minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary">
              Wind Gusts
            </Typography>
            <Typography variant="body1">{formatNumber(data.windGusts, 0)} km/h</Typography>
          </Box>
          <Box sx={{ minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary">
              Cloud Cover
            </Typography>
            <Typography variant="body1">{formatNumber(data.cloudCover, 0)}%</Typography>
          </Box>
          <Box sx={{ minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary">
              Precipitation
            </Typography>
            <Typography variant="body1">{formatNumber(data.precipitation, 1)} mm</Typography>
          </Box>
        </Stack>
      </Collapse>
    </Paper>
  );
}
