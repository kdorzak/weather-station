"use client";

import { useState, useEffect } from "react";
import { Box, Paper, Typography, Stack, Chip, IconButton, Collapse } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { fetchMeteoAlarmAlerts, MeteoAlarmAlert } from "../../lib/open-meteo";

interface Props {
  country?: string;
}

export function WeatherAlerts({ country = "poland" }: Props) {
  const [alerts, setAlerts] = useState<MeteoAlarmAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      const data = await fetchMeteoAlarmAlerts(country);
      setAlerts(data);
      setLoading(false);
    };

    loadAlerts();
    // Refresh alerts every 15 minutes
    const interval = setInterval(loadAlerts, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [country]);

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
        <Typography variant="caption" color="text.secondary">
          Ładowanie ostrzeżeń meteorologicznych...
        </Typography>
      </Paper>
    );
  }

  if (alerts.length === 0) {
    return (
      <Paper sx={{ p: 2, bgcolor: "success.light" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ color: "success.dark" }}>
            ✅ Brak aktywnych ostrzeżeń meteorologicznych
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1 }}>
        Ostrzeżenia MeteoAlarm ({alerts.length})
      </Typography>
      {alerts.map((alert) => {
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
