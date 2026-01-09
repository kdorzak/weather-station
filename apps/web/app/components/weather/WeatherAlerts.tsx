"use client";

import { useState } from "react";
import { Box, Paper, Typography, Stack, Chip, IconButton, Collapse, Button } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useWeatherAlerts } from "../../lib/hooks/useWeatherAlerts";

interface Props {
  country?: string;
}

export function WeatherAlerts({ country = "poland" }: Props) {
  const { alerts, activeAlerts, loading, error, hasActiveAlerts, refresh } = useWeatherAlerts(country);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const toggleExpand = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Ładowanie ostrzeżeń meteorologicznych...
          </Typography>
          <IconButton size="small" onClick={refresh} disabled>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, bgcolor: "error.light" }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: "error.dark" }}>
            ❌ Błąd ładowania ostrzeżeń: {error}
          </Typography>
          <IconButton size="small" onClick={refresh} sx={{ color: "error.dark" }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    );
  }

  if (!hasActiveAlerts) {
    return (
      <Paper sx={{ p: 2, bgcolor: "success.light" }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: "success.dark" }}>
            ✅ Brak aktywnych ostrzeżeń meteorologicznych
          </Typography>
          <IconButton size="small" onClick={refresh} sx={{ color: "success.dark" }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ px: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Ostrzeżenia MeteoAlarm ({activeAlerts.length})
        </Typography>
        <IconButton size="small" onClick={refresh} sx={{ color: "text.secondary" }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Stack>
      {activeAlerts.map((alert) => {
        const isExpanded = expandedAlerts.has(alert.id);
        const expiresDate = new Date(alert.expires);
        const isExpired = expiresDate < new Date();

        return (
          <Paper
            key={alert.id}
            elevation={2}
            sx={{
              bgcolor: alert.bgColor,
              border: `2px solid ${alert.color}`,
              opacity: isExpired ? 0.6 : 1,
            }}
          >
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                  <Typography variant="h4">{alert.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: alert.color, fontWeight: 600 }}>
                      {alert.event}
                    </Typography>
                    <Typography variant="caption" sx={{ color: alert.color }}>
                      {alert.areaDesc}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Chip
                    label={alert.severity.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: alert.color,
                      color: "white",
                      fontWeight: 600,
                      fontSize: 10,
                    }}
                  />
                  <IconButton size="small" onClick={() => toggleExpand(alert.id)} sx={{ color: alert.color }}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Stack>
              </Stack>

              <Collapse in={isExpanded}>
                <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alert.color}` }}>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" sx={{ color: alert.color, fontWeight: 600 }}>
                        Ważność:
                      </Typography>
                      <Typography variant="body2" sx={{ color: alert.color }}>
                        Od: {new Date(alert.onset).toLocaleString("pl-PL")}
                      </Typography>
                      <Typography variant="body2" sx={{ color: alert.color }}>
                        Do: {new Date(alert.expires).toLocaleString("pl-PL")}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: alert.color, fontWeight: 600 }}>
                        Pewność: {alert.certainty} | Pilność: {alert.urgency}
                      </Typography>
                    </Box>
                    {alert.description && (
                      <Box>
                        <Typography variant="caption" sx={{ color: alert.color, fontWeight: 600 }}>
                          Opis:
                        </Typography>
                        <Typography variant="body2" sx={{ color: alert.color }}>
                          {alert.description}
                        </Typography>
                      </Box>
                    )}
                    {alert.instruction && (
                      <Box>
                        <Typography variant="caption" sx={{ color: alert.color, fontWeight: 600 }}>
                          Zalecenia:
                        </Typography>
                        <Typography variant="body2" sx={{ color: alert.color }}>
                          {alert.instruction}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}
