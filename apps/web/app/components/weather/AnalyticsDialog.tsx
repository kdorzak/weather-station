"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Stack,
  Box,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from "recharts";
import { fetchAnalyticsData, AnalyticsData, AnalyticsHourly } from "../../lib/open-meteo";
import { formatNumber } from "../../lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  locationName?: string;
}

const COLORS = {
  temperature: "#ef4444",
  feelsLike: "#f97316",
  dewpoint: "#06b6d4",
  humidity: "#3b82f6",
  pressure: "#8b5cf6",
  wind: "#22c55e",
  gusts: "#14b8a6",
  uv: "#eab308",
  solar: "#f59e0b",
  precipitation: "#6366f1",
  clouds: "#94a3b8",
  soil: "#a16207",
};

const formatTime = (time: string) => {
  const d = new Date(time);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (time: string) => {
  const d = new Date(time);
  return d.toLocaleDateString(undefined, { weekday: "short", hour: "2-digit" });
};

function SummaryCard({ label, value, unit, color }: { label: string; value: number; unit: string; color?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1, minWidth: 80 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color: color ?? "text.primary" }}>
        {formatNumber(value, 1)}{unit}
      </Typography>
    </Paper>
  );
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

export function AnalyticsDialog({ open, onClose, latitude, longitude, locationName }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (open && !data) {
      setLoading(true);
      setError(null);
      fetchAnalyticsData(latitude, longitude, 3, 1)
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [open, latitude, longitude, data]);

  // Reset data when location changes
  useEffect(() => {
    setData(null);
  }, [latitude, longitude]);

  const handleClose = () => {
    onClose();
  };

  // Prepare chart data - sample every 2 hours for cleaner display
  const chartData = data?.hourly
    .filter((_, i) => i % 2 === 0)
    .map((h) => ({
      time: formatDate(h.time),
      fullTime: h.time,
      temp: h.temperature,
      feels: h.feelsLike,
      dewpoint: h.dewpoint,
      humidity: h.humidity,
      pressure: h.pressure,
      clouds: h.cloudCover,
      wind: h.windSpeed,
      gusts: h.windGusts,
      uv: h.uvIndex,
      precip: h.precipitation,
      precipProb: h.precipitationProbability,
      solar: h.solarRadiation,
      soilTemp: h.soilTemperature,
      soilMoist: h.soilMoisture * 100,
    })) ?? [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box>
          <Typography variant="subtitle1" component="span" fontWeight={600}>
            Weather Analytics
          </Typography>
          {locationName && (
            <Typography variant="body2" color="text.secondary">
              {locationName} · {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {data && !loading && (
          <Stack spacing={2}>
            {/* Summary Stats */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <SummaryCard label="Min Temp" value={data.summary.tempMin} unit="°" color={COLORS.dewpoint} />
              <SummaryCard label="Max Temp" value={data.summary.tempMax} unit="°" color={COLORS.temperature} />
              <SummaryCard label="Avg Temp" value={data.summary.tempAvg} unit="°" />
              <SummaryCard label="Max UV" value={data.summary.uvMax} unit="" color={COLORS.uv} />
              <SummaryCard label="Max Wind" value={data.summary.windMax} unit=" km/h" color={COLORS.wind} />
              <SummaryCard label="Total Precip" value={data.summary.precipTotal} unit=" mm" color={COLORS.precipitation} />
            </Stack>

            {/* Tabs */}
            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Temperature" />
              <Tab label="Humidity & Clouds" />
              <Tab label="Wind" />
              <Tab label="UV & Solar" />
              <Tab label="Precipitation" />
              <Tab label="Soil" />
            </Tabs>

            {/* Temperature Chart */}
            <TabPanel value={tabIndex} index={0}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} unit="°" />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="temp" name="Temperature" stroke={COLORS.temperature} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="feels" name="Feels Like" stroke={COLORS.feelsLike} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="dewpoint" name="Dewpoint" stroke={COLORS.dewpoint} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </TabPanel>

            {/* Humidity & Clouds Chart */}
            <TabPanel value={tabIndex} index={1}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" dataKey="humidity" name="Humidity" stroke={COLORS.humidity} fill={COLORS.humidity} fillOpacity={0.3} />
                  <Area type="monotone" dataKey="clouds" name="Cloud Cover" stroke={COLORS.clouds} fill={COLORS.clouds} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </TabPanel>

            {/* Wind Chart */}
            <TabPanel value={tabIndex} index={2}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} unit=" km/h" />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" dataKey="gusts" name="Gusts" stroke={COLORS.gusts} fill={COLORS.gusts} fillOpacity={0.2} />
                  <Line type="monotone" dataKey="wind" name="Wind Speed" stroke={COLORS.wind} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </TabPanel>

            {/* UV & Solar Chart */}
            <TabPanel value={tabIndex} index={3}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} unit=" W/m²" />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="uv" name="UV Index" stroke={COLORS.uv} strokeWidth={2} dot={false} />
                  <Area yAxisId="right" type="monotone" dataKey="solar" name="Solar Radiation" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.3} />
                </ComposedChart>
              </ResponsiveContainer>
            </TabPanel>

            {/* Precipitation Chart */}
            <TabPanel value={tabIndex} index={4}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} unit="%" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} unit=" mm" />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="precipProb" name="Probability" stroke="#818cf8" strokeWidth={2} dot={false} />
                  <Bar yAxisId="right" dataKey="precip" name="Precipitation" fill={COLORS.precipitation} opacity={0.7} />
                </ComposedChart>
              </ResponsiveContainer>
            </TabPanel>

            {/* Soil Chart */}
            <TabPanel value={tabIndex} index={5}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} unit="°" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="soilTemp" name="Soil Temp" stroke={COLORS.soil} strokeWidth={2} dot={false} />
                  <Area yAxisId="right" type="monotone" dataKey="soilMoist" name="Soil Moisture" stroke={COLORS.humidity} fill={COLORS.humidity} fillOpacity={0.3} />
                </ComposedChart>
              </ResponsiveContainer>
            </TabPanel>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              Data: Open-Meteo · {data.location.timezone} · Last {chartData.length * 2} hours
            </Typography>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
