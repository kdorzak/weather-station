"use client";

import {
  Paper,
  Typography,
  Stack,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { formatNumber } from "../../lib/format";

interface StationData {
  device_id: string;
  updated_at: string;
  series: {
    metric: string;
    label: string;
    unit: string;
    data: { ts: string; value: number }[];
  }[];
}

interface Props {
  data: StationData | null;
  loading?: boolean;
}

type LatestReading = {
  value: number;
  ts: string;
  unit: string;
  label: string;
};

const getLatestByMetric = (data: StationData) => {
  const map = new Map<string, LatestReading>();
  for (const s of data.series) {
    const latest = [...s.data].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    )[0];
    if (latest) {
      map.set(s.metric, { value: latest.value, ts: latest.ts, unit: s.unit, label: s.label });
    }
  }
  return map;
};

const getHistoryRows = (data: StationData) => {
  const grouped = new Map<string, Record<string, number>>();
  for (const s of data.series) {
    for (const point of s.data) {
      grouped.set(point.ts, { ...(grouped.get(point.ts) ?? {}), [s.metric]: point.value });
    }
  }
  return Array.from(grouped.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([ts, metrics]) => ({ ts, metrics }));
};

export function StationReadings({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Loading station data...</Typography>
      </Paper>
    );
  }

  const latest = getLatestByMetric(data);
  const history = getHistoryRows(data);

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase">
            Station Readings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.device_id}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {new Date(data.updated_at).toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </Typography>
      </Stack>

      {/* Main Readings */}
      <Stack direction="row" flexWrap="wrap" gap={3}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Temperature
          </Typography>
          <Typography variant="h4">
            {formatNumber(latest.get("temperature")?.value, 1)}°C
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Humidity
          </Typography>
          <Typography variant="h4">
            {formatNumber(latest.get("humidity")?.value, 0)}%
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Pressure
          </Typography>
          <Typography variant="h5">
            {formatNumber(latest.get("pressure")?.value, 1)} hPa
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Battery
          </Typography>
          <Typography variant="h5">
            {formatNumber(latest.get("battery_voltage")?.value, 2)} V
          </Typography>
        </Box>
      </Stack>

      {/* History Accordion */}
      <Accordion sx={{ mt: 2, "&:before": { display: "none" } }} elevation={0}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" color="text.secondary">
            Recent History
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Table size="small">
            <TableBody>
              {history.slice(0, 10).map(({ ts, metrics }) => (
                <TableRow key={ts}>
                  <TableCell sx={{ pl: 0 }}>
                    {new Date(ts).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{formatNumber(metrics.temperature, 1)}°C</TableCell>
                  <TableCell>{formatNumber(metrics.humidity, 0)}%</TableCell>
                  <TableCell>{formatNumber(metrics.pressure, 1)} hPa</TableCell>
                  <TableCell sx={{ pr: 0 }}>{formatNumber(metrics.battery_voltage, 2)} V</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}
