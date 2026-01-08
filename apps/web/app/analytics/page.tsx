"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWRImmutable from "swr/immutable";
import { fetchMe } from "../lib/api-client";
import { useAnalytics } from "../lib/hooks/useAnalytics";
import { Skeleton } from "../components/Skeleton";
import { formatNumber } from "../lib/format";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  LinearProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from "recharts";

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

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

const MetricCard = ({
  title,
  value,
  unit,
  subtitle,
  color,
  icon,
}: {
  title: string;
  value: string | number;
  unit: string;
  subtitle?: string;
  color?: string;
  icon?: string;
}) => (
  <Paper elevation={0} sx={{ p: 2, bgcolor: "background.default", borderRadius: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={600} sx={{ color: color ?? "text.primary" }}>
          {value}
          <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 0.5 }}>
            {unit}
          </Typography>
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {icon && <Typography variant="h3">{icon}</Typography>}
    </Stack>
  </Paper>
);

const UVGauge = ({ value, risk }: { value: number; risk: { level: string; color: string } }) => (
  <Paper elevation={0} sx={{ p: 2, bgcolor: "background.default", borderRadius: 2 }}>
    <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
      UV Index
    </Typography>
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
      <Typography variant="h3" fontWeight={700} sx={{ color: risk.color }}>
        {formatNumber(value, 1)}
      </Typography>
      <Box sx={{ flex: 1 }}>
        <Chip label={risk.level} size="small" sx={{ bgcolor: risk.color, color: "white", fontWeight: 600 }} />
        <LinearProgress
          variant="determinate"
          value={Math.min(value * 9, 100)}
          sx={{
            mt: 1,
            height: 8,
            borderRadius: 4,
            bgcolor: "action.hover",
            "& .MuiLinearProgress-bar": { bgcolor: risk.color, borderRadius: 4 },
          }}
        />
      </Box>
    </Stack>
  </Paper>
);

const ComfortGauge = ({ level, score }: { level: string; score: number }) => {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: "background.default", borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
        Comfort Level
      </Typography>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
        <Typography variant="h3" fontWeight={700} sx={{ color }}>
          {score}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Chip label={level} size="small" sx={{ bgcolor: color, color: "white", fontWeight: 600 }} />
          <LinearProgress
            variant="determinate"
            value={score}
            sx={{
              mt: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
            }}
          />
        </Box>
      </Stack>
    </Paper>
  );
};

const formatHour = (time: string) => {
  const d = new Date(time);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const formatDay = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const AnalyticsPage = () => {
  const router = useRouter();
  const [tabIndex, setTabIndex] = useState(0);
  const [chartRange, setChartRange] = useState<"24h" | "48h" | "7d">("48h");

  const { data: me, isLoading: meLoading } = useSWRImmutable("auth/me", () => fetchMe(), {
    shouldRetryOnError: false,
  });

  const { summary, hourly, daily, location, units, loading, error, cached } = useAnalytics();

  useEffect(() => {
    if (!meLoading && (!me || me.status !== "ok")) {
      router.replace("/login");
    }
  }, [meLoading, me, router]);

  if (meLoading || loading) {
    return (
      <Stack spacing={2}>
        <Skeleton height={60} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((k) => (
            <Grid item xs={6} md={3} key={k}>
              <Skeleton height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton height={300} />
      </Stack>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader title="Weather Analytics" />
        <CardContent>
          <Typography color="error">{error ?? "Failed to load analytics data"}</Typography>
          <Link href="/">← Back to Dashboard</Link>
        </CardContent>
      </Card>
    );
  }

  // Filter hourly data based on selected range
  const now = new Date();
  const rangeHours = chartRange === "24h" ? 24 : chartRange === "48h" ? 48 : 168;
  const filteredHourly = hourly.filter((h) => {
    const t = new Date(h.time);
    const diffHours = (t.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= -24 && diffHours <= rangeHours - 24;
  });

  // Prepare chart data
  const tempChartData = filteredHourly.map((h) => ({
    time: formatHour(h.time),
    fullTime: h.time,
    temperature: h.temperature.actual,
    feelsLike: h.temperature.feels_like,
    dewpoint: h.temperature.dewpoint,
  }));

  const atmosphericChartData = filteredHourly.map((h) => ({
    time: formatHour(h.time),
    humidity: h.humidity,
    pressure: h.pressure.sea_level,
    clouds: h.clouds.total,
  }));

  const windChartData = filteredHourly.map((h) => ({
    time: formatHour(h.time),
    speed: h.wind.speed_10m,
    gusts: h.wind.gusts,
    speed80m: h.wind.speed_80m,
  }));

  const solarChartData = filteredHourly
    .filter((h) => h.is_day)
    .map((h) => ({
      time: formatHour(h.time),
      shortwave: h.solar.shortwave,
      direct: h.solar.direct,
      diffuse: h.solar.diffuse,
      uv: h.uv.index * 50,
    }));

  const precipChartData = filteredHourly.map((h) => ({
    time: formatHour(h.time),
    probability: h.precipitation.probability,
    precipitation: h.precipitation.total * 10,
  }));

  const soilChartData = filteredHourly.map((h) => ({
    time: formatHour(h.time),
    surface: h.soil.temperature_surface,
    depth6cm: h.soil.temperature_6cm,
    depth18cm: h.soil.temperature_18cm,
    moisture: h.soil.moisture_0_1cm * 100,
  }));

  const dailyChartData = daily.map((d) => ({
    date: formatDay(d.date),
    max: d.temperature.max,
    min: d.temperature.min,
    precipitation: d.precipitation.sum,
    uvMax: d.uv.max,
    sunshine: d.sun.sunshine_duration / 3600,
  }));

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Weather Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {location?.latitude.toFixed(4)}°N, {location?.longitude.toFixed(4)}°E · {location?.timezone}
            {cached && <Chip size="small" label="Cached" sx={{ ml: 1 }} />}
          </Typography>
        </Box>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Chip label="← Dashboard" variant="outlined" clickable />
        </Link>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Temperature"
            value={formatNumber(summary.temperature.current, 1)}
            unit="°C"
            subtitle={`Range: ${formatNumber(summary.temperature.min, 0)}° – ${formatNumber(summary.temperature.max, 0)}°`}
            color={COLORS.temperature}
            icon={summary.today?.weather.icon}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Wind"
            value={formatNumber(summary.wind.current, 1)}
            unit="km/h"
            subtitle={`Max: ${formatNumber(summary.wind.max, 0)} km/h`}
            color={COLORS.wind}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <UVGauge value={summary.uv.current ?? 0} risk={summary.uv.max_risk} />
        </Grid>
        <Grid item xs={6} md={3}>
          <ComfortGauge level={summary.comfort?.level ?? "Unknown"} score={summary.comfort?.score ?? 0} />
        </Grid>
      </Grid>

      {/* Solar Summary */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <MetricCard
            title="Solar Radiation"
            value={formatNumber(summary.solar.current, 0)}
            unit="W/m²"
            subtitle={`Today's total: ${formatNumber(summary.solar.total_today / 1000, 1)} kWh/m²`}
            color={COLORS.solar}
            icon="☀️"
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <MetricCard
            title="Sunrise"
            value={summary.today ? new Date(summary.today.sun.sunrise).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "--"}
            unit=""
            subtitle={`Daylight: ${formatNumber((summary.today?.sun.daylight_duration ?? 0) / 3600, 1)}h`}
            icon="🌅"
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <MetricCard
            title="Sunset"
            value={summary.today ? new Date(summary.today.sun.sunset).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "--"}
            unit=""
            subtitle={`Sunshine: ${formatNumber((summary.today?.sun.sunshine_duration ?? 0) / 3600, 1)}h`}
            icon="🌇"
          />
        </Grid>
      </Grid>

      {/* Chart Range Selector */}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <ToggleButtonGroup
          value={chartRange}
          exclusive
          onChange={(_, v) => v && setChartRange(v)}
          size="small"
        >
          <ToggleButton value="24h">24h</ToggleButton>
          <ToggleButton value="48h">48h</ToggleButton>
          <ToggleButton value="7d">7 days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Tabs */}
      <Card>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Temperature" />
          <Tab label="Atmospheric" />
          <Tab label="Wind" />
          <Tab label="Solar & UV" />
          <Tab label="Precipitation" />
          <Tab label="Soil" />
          <Tab label="Daily Overview" />
        </Tabs>
        <Divider />
        <CardContent>
          {/* Temperature Tab */}
          <TabPanel value={tabIndex} index={0}>
            <Typography variant="h6" gutterBottom>Temperature Trends</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={tempChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} unit="°" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Legend />
                <Line type="monotone" dataKey="temperature" name="Temperature" stroke={COLORS.temperature} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="feelsLike" name="Feels Like" stroke={COLORS.feelsLike} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="dewpoint" name="Dewpoint" stroke={COLORS.dewpoint} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </TabPanel>

          {/* Atmospheric Tab */}
          <TabPanel value={tabIndex} index={1}>
            <Typography variant="h6" gutterBottom>Atmospheric Conditions</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Humidity & Cloud Cover</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={atmosphericChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                    <Legend />
                    <Area type="monotone" dataKey="humidity" name="Humidity" stroke={COLORS.humidity} fill={COLORS.humidity} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="clouds" name="Cloud Cover" stroke={COLORS.clouds} fill={COLORS.clouds} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Pressure</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={atmosphericChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} domain={["dataMin - 5", "dataMax + 5"]} unit=" hPa" />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                    <ReferenceLine y={1013.25} stroke="#6b7280" strokeDasharray="3 3" label="Standard" />
                    <Line type="monotone" dataKey="pressure" name="Pressure" stroke={COLORS.pressure} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Wind Tab */}
          <TabPanel value={tabIndex} index={2}>
            <Typography variant="h6" gutterBottom>Wind Analysis</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={windChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} unit=" km/h" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="gusts" name="Gusts" stroke={COLORS.gusts} fill={COLORS.gusts} fillOpacity={0.2} />
                <Line type="monotone" dataKey="speed" name="Wind 10m" stroke={COLORS.wind} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="speed80m" name="Wind 80m" stroke="#86efac" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </TabPanel>

          {/* Solar & UV Tab */}
          <TabPanel value={tabIndex} index={3}>
            <Typography variant="h6" gutterBottom>Solar Radiation & UV Index</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={solarChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} unit=" W/m²" />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} domain={[0, 550]} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="shortwave" name="Total Radiation" stroke={COLORS.solar} fill={COLORS.solar} fillOpacity={0.3} />
                <Line yAxisId="left" type="monotone" dataKey="direct" name="Direct" stroke="#fbbf24" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="diffuse" name="Diffuse" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="uv" name="UV (×50)" stroke={COLORS.uv} strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </TabPanel>

          {/* Precipitation Tab */}
          <TabPanel value={tabIndex} index={4}>
            <Typography variant="h6" gutterBottom>Precipitation Forecast</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={precipChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} unit="%" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                <Legend />
                <Bar yAxisId="right" dataKey="precipitation" name="Precipitation (×10)" fill={COLORS.precipitation} opacity={0.7} />
                <Line yAxisId="left" type="monotone" dataKey="probability" name="Probability" stroke="#818cf8" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </TabPanel>

          {/* Soil Tab */}
          <TabPanel value={tabIndex} index={5}>
            <Typography variant="h6" gutterBottom>Soil Conditions</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Soil Temperature by Depth</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={soilChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} unit="°" />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="surface" name="Surface" stroke={COLORS.soil} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="depth6cm" name="6cm" stroke="#ca8a04" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="depth18cm" name="18cm" stroke="#78350f" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Soil Moisture (0-1cm)</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={soilChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="moisture" name="Moisture" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Daily Overview Tab */}
          <TabPanel value={tabIndex} index={6}>
            <Typography variant="h6" gutterBottom>Daily Overview</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} unit="°" />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} />
                <Legend />
                <Bar yAxisId="left" dataKey="max" name="High" fill={COLORS.temperature} opacity={0.8} />
                <Bar yAxisId="left" dataKey="min" name="Low" fill={COLORS.dewpoint} opacity={0.8} />
                <Line yAxisId="right" type="monotone" dataKey="sunshine" name="Sunshine (h)" stroke={COLORS.solar} strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Daily Cards */}
            <Stack direction="row" spacing={2} sx={{ mt: 3, overflowX: "auto", pb: 1 }}>
              {daily.map((d) => (
                <Paper key={d.date} elevation={0} sx={{ p: 2, minWidth: 140, bgcolor: "background.default", borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600}>{formatDay(d.date)}</Typography>
                  <Typography variant="h4" sx={{ my: 1 }}>{d.weather.icon}</Typography>
                  <Typography variant="body2">{d.weather.description}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.5}>
                    <Typography variant="caption">
                      <strong>{formatNumber(d.temperature.max, 0)}°</strong> / {formatNumber(d.temperature.min, 0)}°
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      💧 {d.precipitation.probability_max}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      💨 {formatNumber(d.wind.speed_max, 0)} km/h
                    </Typography>
                    <Typography variant="caption" sx={{ color: d.uv.risk.color }}>
                      UV {formatNumber(d.uv.max, 1)}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Footer */}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        Data provided by Open-Meteo · Updated every 15 minutes
      </Typography>
    </Stack>
  );
};

export default AnalyticsPage;
