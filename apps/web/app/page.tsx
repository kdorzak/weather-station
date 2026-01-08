"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboardData } from "./lib/hooks/useDashboardData";
import { Skeleton } from "./components/Skeleton";
import { CurrentWeather } from "./components/CurrentWeather";
import { DailyForecast, HourlyForecast } from "./components/WeatherForecast";
import { formatNumber } from "./lib/format";
import { useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Button,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Chip,
} from "@mui/material";

type ChartPoint = { ts: string; value: number };
type ChartSeries = { metric: string; label: string; unit: string; data: ChartPoint[] };

const latestByMetric = (series: ChartSeries[]) => {
  const map = new Map<string, { value: number; ts: string; unit: string; label: string }>();
  for (const s of series) {
    const latest = [...s.data].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    )[0];
    if (latest) map.set(s.metric, { value: latest.value, ts: latest.ts, unit: s.unit, label: s.label });
  }
  return map;
};

const historyRows = (series: ChartSeries[]) => {
  const grouped = new Map<string, Record<string, number>>();
  for (const s of series) {
    for (const point of s.data) {
      grouped.set(point.ts, { ...(grouped.get(point.ts) ?? {}), [s.metric]: point.value });
    }
  }
  return Array.from(grouped.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([ts, metrics]) => ({ ts, metrics }));
};

const Home = () => {
  const router = useRouter();
  const { userEmail, data, loading, error, reload, logout } = useDashboardData();

  useEffect(() => {
    if (!loading && !userEmail) {
      router.replace("/login");
    }
  }, [loading, userEmail, router]);

  if (loading) {
    return (
      <Card>
        <CardHeader title="Loading…" />
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

  if (error && !data) {
    return (
      <Card>
        <CardHeader title="Could not load data" />
        <CardContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={reload}>
              Retry
            </Button>
            <Button variant="outlined" onClick={logout}>
              Logout
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader title="No data yet" />
        <CardContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {error ?? "Could not load chart data."}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={reload}>
              Retry
            </Button>
            <Button variant="outlined" onClick={logout}>
              Logout
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const latest = latestByMetric(data.series);
  const rows = historyRows(data.series);

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Latest reading"
              subheader={new Date(data.updated_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              action={<Chip size="small" label={`Signed in as ${userEmail}`} />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Temperature
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(latest.get("temperature")?.value)}°C
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Humidity
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(latest.get("humidity")?.value, 0)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Pressure
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(latest.get("pressure")?.value, 1)} hPa
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Battery
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(latest.get("battery_voltage")?.value, 3)} V
                  </Typography>
                </Grid>
              </Grid>
              <Button onClick={logout} sx={{ mt: 2 }} variant="outlined">
                Logout
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Card>
              <CardHeader title="Device" subheader="Station metadata" />
              <CardContent>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Device ID
                    </Typography>
                    <Typography variant="body1">{data.device_id}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body1">50.0155, 20.0163</Typography>
                  </Box>
                  <Link href="/about">About this project →</Link>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Open-Meteo Weather Section */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
        <Box>
          <Typography variant="h5">External Weather Data</Typography>
          <Typography variant="body2" color="text.secondary">
            Model-based weather data from Open-Meteo for comparison and forecasting
          </Typography>
        </Box>
        <Link href="/analytics" style={{ textDecoration: "none" }}>
          <Chip
            label="📊 Advanced Analytics →"
            variant="outlined"
            clickable
            sx={{ fontWeight: 500 }}
          />
        </Link>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <CurrentWeather />
        </Grid>
        <Grid item xs={12} md={8}>
          <HourlyForecast />
        </Grid>
      </Grid>

      <DailyForecast />

      <Card>
        <CardHeader title="Recent readings" subheader="Dummy data served from the API." />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Temp</TableCell>
                <TableCell>Humidity</TableCell>
                <TableCell>Pressure</TableCell>
                <TableCell>Battery</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ ts, metrics }) => (
                <TableRow key={ts}>
                  <TableCell>
                    {new Date(ts).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{formatNumber(metrics.temperature)}°C</TableCell>
                  <TableCell>{formatNumber(metrics.humidity, 0)}%</TableCell>
                  <TableCell>{formatNumber(metrics.pressure, 1)} hPa</TableCell>
                  <TableCell>{formatNumber(metrics.battery_voltage, 3)} V</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Home;
