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
  ReferenceLine,
  Brush,
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
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);

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

  // Prepare chart data - show all data with proper date/time formatting
  const chartData = data?.hourly.map((h, index) => {
    const dataTime = new Date(h.time);
    const isPast = dataTime < new Date();
    const dayLabel = dataTime.toLocaleDateString(undefined, { weekday: "short" });
    const timeLabel = dataTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return {
      index,
      time: `${dayLabel} ${timeLabel}`,
      fullTime: h.time,
      isPast,
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
    };
  }) ?? [];

  // Find the index closest to "now" for reference line
  const now = new Date();
  const nowIndex = chartData.findIndex((d) => !d.isPast);
  const nowTime = nowIndex >= 0 ? chartData[nowIndex]?.time : null;

  // Set brush to start at 24th hour (now)
  useEffect(() => {
    if (chartData.length > 0 && brushStartIndex === undefined) {
      setBrushStartIndex(24);
      setBrushEndIndex(Math.min(96, chartData.length - 1));
    }
  }, [chartData.length, brushStartIndex]);

  const handleBrushChange = (data: { startIndex?: number; endIndex?: number }) => {
    if (data.startIndex !== undefined && data.endIndex !== undefined) {
      setBrushStartIndex(data.startIndex);
      setBrushEndIndex(data.endIndex);
    }
  };

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
          <Box sx={{ p: 3 }}>
            {/* Summary Stats */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" justifyContent="center">
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
              <Box sx={{ width: "100%", maxWidth: 800, mx: "auto" }}>
                <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke="#9ca3af" fontSize={11} unit="°" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                    labelFormatter={(value) => value}
                  />
                  <Legend />
                  {nowTime && <ReferenceLine x={nowTime} stroke="#22c55e" strokeWidth={2} label={{ value: "Now", fill: "#22c55e", fontSize: 10 }} />}
                  <Line type="monotone" dataKey="temp" name="Temperature" stroke={COLORS.temperature} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="feels" name="Feels Like" stroke={COLORS.feelsLike} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="dewpoint" name="Dewpoint (temp where water condenses)" stroke={COLORS.dewpoint} strokeWidth={2} dot={false} />
                  <Brush 
                    dataKey="time" 
                    height={30} 
                    stroke="#94a3b8" 
                    fill="#374151"
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onDragEnd={handleBrushChange}
                  />
                </LineChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* Humidity & Clouds Chart */}
            <TabPanel value={tabIndex} index={1}>
              <Box sx={{ width: "100%", maxWidth: 800, mx: "auto" }}>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#9ca3af" fontSize={11} unit="%" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                      labelFormatter={(value) => value}
                    />
                    <Legend />
                    {nowTime && <ReferenceLine x={nowTime} stroke="#22c55e" strokeWidth={2} label={{ value: "Now", fill: "#22c55e", fontSize: 10 }} />}
                    <Area type="monotone" dataKey="humidity" name="Humidity" stroke={COLORS.humidity} fill={COLORS.humidity} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="clouds" name="Cloud Cover" stroke={COLORS.clouds} fill={COLORS.clouds} fillOpacity={0.3} />
                    <Brush 
                      dataKey="time" 
                      height={30} 
                      stroke="#94a3b8" 
                      fill="#374151"
                      startIndex={brushStartIndex}
                      endIndex={brushEndIndex}
                      onDragEnd={handleBrushChange}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* Wind Chart */}
            <TabPanel value={tabIndex} index={2}>
              <Box sx={{ width: "100%", maxWidth: 800, mx: "auto" }}>
                <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke="#9ca3af" fontSize={11} unit=" km/h" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                    labelFormatter={(value) => value}
                  />
                  <Legend />
                  {nowTime && <ReferenceLine x={nowTime} stroke="#22c55e" strokeWidth={2} label={{ value: "Now", fill: "#22c55e", fontSize: 10 }} />}
                  <Area type="monotone" dataKey="gusts" name="Gusts" stroke={COLORS.gusts} fill={COLORS.gusts} fillOpacity={0.2} />
                  <Line type="monotone" dataKey="wind" name="Wind Speed" stroke={COLORS.wind} strokeWidth={2} dot={false} />
                  <Brush 
                    dataKey="time" 
                    height={30} 
                    stroke="#94a3b8" 
                    fill="#374151"
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onDragEnd={handleBrushChange}
                  />
                </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* UV & Solar Chart */}
            <TabPanel value={tabIndex} index={3}>
              <Box sx={{ width: "100%", maxWidth: 800, mx: "auto" }}>
                <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} unit=" W/m²" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                    labelFormatter={(value) => value}
                  />
                  <Legend />
                  {nowTime && <ReferenceLine x={nowTime} stroke="#22c55e" strokeWidth={2} label={{ value: "Now", fill: "#22c55e", fontSize: 10 }} />}
                  <Line yAxisId="left" type="monotone" dataKey="uv" name="UV Index" stroke={COLORS.uv} strokeWidth={2} dot={false} />
                  <Area yAxisId="right" type="monotone" dataKey="solar" name="Solar Radiation" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.3} />
                  <Brush 
                    dataKey="time" 
                    height={30} 
                    stroke="#94a3b8" 
                    fill="#374151"
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onDragEnd={handleBrushChange}
                  />
                </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* Precipitation Chart */}
            <TabPanel value={tabIndex} index={4}>
              <Box sx={{ width: "100%", maxWidth: 800, mx: "auto" }}>
                <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} unit="%" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} unit=" mm" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                    labelFormatter={(value) => value}
                  />
                  <Legend />
                  {nowTime && <ReferenceLine x={nowTime} stroke="#22c55e" strokeWidth={2} label={{ value: "Now", fill: "#22c55e", fontSize: 10 }} />}
                  <Line yAxisId="left" type="monotone" dataKey="precipProb" name="Probability" stroke="#818cf8" strokeWidth={2} dot={false} />
                  <Bar yAxisId="right" dataKey="precip" name="Precipitation" fill={COLORS.precipitation} opacity={0.7} />
                  <Brush 
                    dataKey="time" 
                    height={30} 
                    stroke="#94a3b8" 
                    fill="#374151"
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onDragEnd={handleBrushChange}
                  />
                </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* Soil Chart */}
            <TabPanel value={tabIndex} index={5}>
              <Box sx={{ width: "100%", maxWidth: 800, mx: "auto" }}>
                <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} unit="°" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                    labelFormatter={(value) => value}
                  />
                  <Legend />
                  {nowTime && <ReferenceLine x={nowTime} stroke="#22c55e" strokeWidth={2} label={{ value: "Now", fill: "#22c55e", fontSize: 10 }} />}
                  <Line yAxisId="left" type="monotone" dataKey="soilTemp" name="Soil Temp" stroke={COLORS.soil} strokeWidth={2} dot={false} />
                  <Area yAxisId="right" type="monotone" dataKey="soilMoist" name="Soil Moisture" stroke={COLORS.humidity} fill={COLORS.humidity} fillOpacity={0.3} />
                  <Brush 
                    dataKey="time" 
                    height={30} 
                    stroke="#94a3b8" 
                    fill="#374151"
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onDragEnd={handleBrushChange}
                  />
                </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            <Stack direction="row" justifyContent="center">
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  📅 Timeline: 1 day past → Now → 3 days future | Drag the slider below charts to zoom
                </Typography>
              </Paper>
            </Stack>
            
            <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Data: Open-Meteo · {data.location.timezone} · Showing {chartData.length} data points
              </Typography>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
