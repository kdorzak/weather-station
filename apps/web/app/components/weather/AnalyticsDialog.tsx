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
  wetBulb: "#0ea5e9",
  vpd: "#d946ef",
};

const formatTime = (time: string) => {
  const d = new Date(time);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (time: string) => {
  const d = new Date(time);
  return d.toLocaleDateString(undefined, { weekday: "short", hour: "2-digit" });
};

// Biomet condition calculator based on temperature, humidity, wind, and pressure
type BiometCondition = {
  level: number; // 1-6 (1=very favorable, 6=very unfavorable)
  label: string;
  labelPL: string;
  color: string;
  bgColor: string;
};

function calculateBiometCondition(
  temp: number,
  humidity: number,
  wind: number,
  pressure: number,
  feelsLike: number
): BiometCondition {
  let score = 0;
  
  // Temperature stress (optimal 18-24°C)
  if (temp >= 18 && temp <= 24) score += 0;
  else if (temp >= 15 && temp < 18) score += 1;
  else if (temp > 24 && temp <= 28) score += 1;
  else if (temp >= 10 && temp < 15) score += 2;
  else if (temp > 28 && temp <= 32) score += 2;
  else if (temp >= 5 && temp < 10) score += 3;
  else if (temp > 32 && temp <= 36) score += 3;
  else if (temp < 5 || temp > 36) score += 4;
  
  // Humidity stress (optimal 40-60%)
  if (humidity >= 40 && humidity <= 60) score += 0;
  else if (humidity >= 30 && humidity < 40) score += 0.5;
  else if (humidity > 60 && humidity <= 70) score += 0.5;
  else if (humidity >= 20 && humidity < 30) score += 1;
  else if (humidity > 70 && humidity <= 80) score += 1;
  else if (humidity < 20 || humidity > 80) score += 2;
  
  // Wind stress (optimal < 15 km/h)
  if (wind < 15) score += 0;
  else if (wind >= 15 && wind < 30) score += 0.5;
  else if (wind >= 30 && wind < 50) score += 1;
  else if (wind >= 50) score += 2;
  
  // Pressure change stress (simplified - based on absolute value)
  if (pressure >= 1010 && pressure <= 1025) score += 0;
  else if (pressure >= 1000 && pressure < 1010) score += 0.5;
  else if (pressure > 1025 && pressure <= 1035) score += 0.5;
  else score += 1;
  
  // Feels like difference (thermal stress)
  const thermalDiff = Math.abs(temp - feelsLike);
  if (thermalDiff < 3) score += 0;
  else if (thermalDiff >= 3 && thermalDiff < 6) score += 0.5;
  else if (thermalDiff >= 6 && thermalDiff < 10) score += 1;
  else score += 2;
  
  // Map score to condition level
  if (score <= 1) return { level: 1, label: "Favorable", labelPL: "Korzystne", color: "#166534", bgColor: "#86efac" };
  if (score <= 2.5) return { level: 2, label: "Mostly favorable", labelPL: "Umiarkowanie korzystne", color: "#3f6212", bgColor: "#bef264" };
  if (score <= 4) return { level: 3, label: "Neutral", labelPL: "Obojętne", color: "#525252", bgColor: "#e5e5e5" };
  if (score <= 5.5) return { level: 4, label: "Slightly unfavorable", labelPL: "Umiarkowanie niekorzystne", color: "#9a3412", bgColor: "#fed7aa" };
  if (score <= 7) return { level: 5, label: "Unfavorable", labelPL: "Niekorzystne", color: "#b91c1c", bgColor: "#fca5a5" };
  return { level: 6, label: "Very unfavorable", labelPL: "Bardzo niekorzystne", color: "#7f1d1d", bgColor: "#ef4444" };
}

const BIOMET_LEGEND = [
  { level: 1, label: "Favorable", labelPL: "Korzystne", color: "#166534", bgColor: "#86efac" },
  { level: 2, label: "Mostly favorable", labelPL: "Umiarkowanie korzystne", color: "#3f6212", bgColor: "#bef264" },
  { level: 3, label: "Neutral", labelPL: "Obojętne", color: "#525252", bgColor: "#e5e5e5" },
  { level: 4, label: "Slightly unfavorable", labelPL: "Umiarkowanie niekorzystne", color: "#9a3412", bgColor: "#fed7aa" },
  { level: 5, label: "Unfavorable", labelPL: "Niekorzystne", color: "#b91c1c", bgColor: "#fca5a5" },
  { level: 6, label: "Very unfavorable", labelPL: "Bardzo niekorzystne", color: "#7f1d1d", bgColor: "#ef4444" },
];

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
      wetBulb: h.wetBulbTemp,
      vpd: h.vapourPressureDeficit,
      biometCondition: calculateBiometCondition(h.temperature, h.humidity, h.windSpeed, h.pressure, h.feelsLike),
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
              <Tab label="Biomet" />
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

            {/* Biomet Chart */}
            <TabPanel value={tabIndex} index={6}>
              <Box sx={{ width: "100%", maxWidth: 800, mx: "auto" }}>
                {/* Current Biomet Condition */}
                {nowIndex >= 0 && chartData[nowIndex] && (
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      bgcolor: chartData[nowIndex].biometCondition.bgColor,
                      borderRadius: 2,
                      textAlign: "center"
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: chartData[nowIndex].biometCondition.color, fontWeight: 600 }}>
                      Warunki biometeorologiczne teraz
                    </Typography>
                    <Typography variant="h5" sx={{ color: chartData[nowIndex].biometCondition.color, fontWeight: 700 }}>
                      {chartData[nowIndex].biometCondition.labelPL}
                    </Typography>
                    <Typography variant="caption" sx={{ color: chartData[nowIndex].biometCondition.color }}>
                      ({chartData[nowIndex].biometCondition.label})
                    </Typography>
                  </Paper>
                )}

                {/* Legend */}
                <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontWeight: 600 }}>
                    Skala warunków biometeorologicznych:
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="center">
                    {BIOMET_LEGEND.map((item) => (
                      <Box 
                        key={item.level} 
                        sx={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                        }}
                      >
                        <Box sx={{ width: 16, height: 16, bgcolor: item.bgColor, borderRadius: 0.5, border: "1px solid", borderColor: item.color }} />
                        <Typography variant="caption" sx={{ color: item.color, fontSize: 10 }}>
                          {item.labelPL}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>

                <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} unit="°" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} unit=" kPa" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                    labelFormatter={(value) => value}
                  />
                  <Legend />
                  {nowTime && <ReferenceLine x={nowTime} stroke="#22c55e" strokeWidth={2} label={{ value: "Now", fill: "#22c55e", fontSize: 10 }} />}
                  <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperature" stroke={COLORS.temperature} strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="feels" name="Feels Like" stroke={COLORS.feelsLike} strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="wetBulb" name="Wet Bulb Temp" stroke={COLORS.wetBulb} strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="vpd" name="VPD (Vapour Pressure Deficit)" stroke={COLORS.vpd} strokeWidth={2} dot={false} />
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
