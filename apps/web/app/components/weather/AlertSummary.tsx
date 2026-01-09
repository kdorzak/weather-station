"use client";

import { Box, Paper, Typography, Stack, Chip } from "@mui/material";
import { useWeatherAlerts } from "../../lib/hooks/useWeatherAlerts";
import { getAlertCountBySeverity } from "../../lib/alerts";

interface Props {
  country?: string;
}

export function AlertSummary({ country = "poland" }: Props) {
  const { activeAlerts, loading, error } = useWeatherAlerts(country);

  if (loading || error || activeAlerts.length === 0) {
    return null;
  }

  const severityCount = getAlertCountBySeverity(activeAlerts);
  const totalAlerts = activeAlerts.length;

  const severityColors = {
    extreme: "#7f1d1d",
    severe: "#dc2626", 
    moderate: "#ea580c",
    minor: "#ca8a04",
  };

  return (
    <Paper sx={{ p: 2, bgcolor: "warning.light" }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="body2" sx={{ color: "warning.dark", fontWeight: 600 }}>
          ⚠️ {totalAlerts} aktywnych ostrzeżeń
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {Object.entries(severityCount).map(([severity, count]) => (
            <Chip
              key={severity}
              label={`${severity.toUpperCase()}: ${count}`}
              size="small"
              sx={{
                bgcolor: severityColors[severity as keyof typeof severityColors],
                color: "white",
                fontWeight: 600,
                fontSize: 10,
              }}
            />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
