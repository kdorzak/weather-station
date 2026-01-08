"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Paper,
  Typography,
  Stack,
  Box,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import { DailyForecast as DailyData } from "../../lib/open-meteo";
import { formatNumber } from "../../lib/format";

interface Props {
  data: DailyData[];
  loading?: boolean;
}

const formatDay = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "short" });
};

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

interface DayDetailProps {
  day: DailyData;
  open: boolean;
  onClose: () => void;
}

function DayDetail({ day, open, onClose }: DayDetailProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" component="span">
          {new Date(day.date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h2">{day.weatherIcon}</Typography>
            <Typography variant="h6">{day.weatherDescription}</Typography>
          </Box>

          <Divider />

          <Stack direction="row" justifyContent="space-around">
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                High
              </Typography>
              <Typography variant="h5">{formatNumber(day.temperatureMax, 0)}°</Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Low
              </Typography>
              <Typography variant="h5">{formatNumber(day.temperatureMin, 0)}°</Typography>
            </Box>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">🌅 Sunrise</Typography>
              <Typography>{formatTime(day.sunrise)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">🌇 Sunset</Typography>
              <Typography>{formatTime(day.sunset)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">💧 Precipitation</Typography>
              <Typography>{day.precipitationProbability}% ({formatNumber(day.precipitationSum, 1)} mm)</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">💨 Max Wind</Typography>
              <Typography>{formatNumber(day.windSpeedMax, 0)} km/h</Typography>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function DailyForecast({ data, loading }: Props) {
  const [selectedDay, setSelectedDay] = useState<DailyData | null>(null);

  if (loading || data.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Loading forecast...</Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          textTransform="uppercase"
          sx={{ mb: 1, display: "block" }}
        >
          7-Day Forecast
        </Typography>

        <Stack spacing={0.5}>
          {data.slice(0, 7).map((day) => (
            <Stack
              key={day.date}
              direction="row"
              alignItems="center"
              spacing={1}
              onClick={() => setSelectedDay(day)}
              sx={{
                py: 1,
                px: 1,
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Typography sx={{ minWidth: 70 }}>{formatDay(day.date)}</Typography>
              <Box sx={{ fontSize: "1.25rem" }}>{day.weatherIcon}</Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: 1, display: { xs: "none", sm: "block" } }}
              >
                {day.weatherDescription}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ minWidth: 80, justifyContent: "flex-end" }}>
                <Typography color="text.secondary">{formatNumber(day.temperatureMin, 0)}°</Typography>
                <Typography fontWeight={600}>{formatNumber(day.temperatureMax, 0)}°</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                💧{day.precipitationProbability}%
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {selectedDay && (
        <DayDetail
          day={selectedDay}
          open={!!selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}
