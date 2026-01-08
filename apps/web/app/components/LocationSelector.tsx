"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton as MuiIconButton,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CloseIcon from "@mui/icons-material/Close";
import MapIcon from "@mui/icons-material/Map";
import { GeoLocation, GeocodeResult, searchLocation } from "../lib/geolocation";

// Dynamic import for map component to avoid SSR issues
const MapSelector = dynamic(() => import("./MapSelector").then((mod) => ({ default: mod.MapSelector })), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
      <CircularProgress />
    </Box>
  ),
});

interface Props {
  location: GeoLocation;
  loading?: boolean;
  error?: string | null;
  permissionDenied?: boolean;
  onRequestBrowserLocation: () => void;
  onSelectLocation: (result: GeocodeResult) => void;
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

export function LocationSelector({
  location,
  loading,
  error,
  permissionDenied,
  onRequestBrowserLocation,
  onSelectLocation,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchLocation(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (result: GeocodeResult) => {
    onSelectLocation(result);
    handleClose();
  };

  const handleUseMyLocation = () => {
    onRequestBrowserLocation();
    handleClose();
  };

  const handleMapSelect = (result: GeocodeResult) => {
    onSelectLocation(result);
    setMapOpen(false);
    handleClose();
  };

  // Force map re-initialization when dialog opens
  useEffect(() => {
    if (mapOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // This will trigger a re-render of MapSelector with new key
        const event = new Event('forceMapRefresh');
        window.dispatchEvent(event);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mapOpen]);

  return (
    <>
      <Button
        variant="text"
        size="small"
        startIcon={<LocationOnIcon fontSize="small" />}
        onClick={handleClick}
        sx={{ textTransform: "none", color: "text.secondary" }}
      >
        {location.name}
        {location.country && location.name !== location.country && `, ${location.country}`}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Paper sx={{ p: 2, width: 350 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Change Location</Typography>

            {/* Current Location Button */}
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <MyLocationIcon />}
              onClick={handleUseMyLocation}
              disabled={loading}
              fullWidth
            >
              {loading ? "Getting location..." : "Use My Location"}
            </Button>

            {permissionDenied && (
              <Typography variant="caption" color="error">
                Location access denied. Please enable in browser settings.
              </Typography>
            )}

            {error && !permissionDenied && (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            )}

            {/* Tabs */}
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
              <Tab label="Search" icon={<SearchIcon />} iconPosition="start" />
              <Tab label="Map" icon={<MapIcon />} iconPosition="start" />
            </Tabs>

            {/* Search Tab */}
            <TabPanel value={tabValue} index={0}>
              <TextField
                size="small"
                placeholder="Search city, address, or coordinates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {searching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                    </InputAdornment>
                  ),
                }}
                fullWidth
              />

              {/* Search Results */}
              {searchResults.length > 0 && (
                <List dense sx={{ maxHeight: 200, overflow: "auto", mt: 1 }}>
                  {searchResults.map((result, i) => (
                    <ListItemButton key={i} onClick={() => handleSelectResult(result)}>
                      <ListItemText
                        primary={result.name}
                        secondary={[result.admin1, result.country].filter(Boolean).join(", ")}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
                  No results found. Try a different search term.
                </Typography>
              )}
            </TabPanel>

            {/* Map Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ textAlign: "center" }}>
                <Button
                  variant="outlined"
                  startIcon={<MapIcon />}
                  onClick={() => setMapOpen(true)}
                  fullWidth
                >
                  Open Map to Select Location
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  Click anywhere on the map to select location
                </Typography>
              </Box>
            </TabPanel>

            {/* Current Location Info */}
            <Box sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                Current: {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Popover>

      {/* Map Dialog */}
      <Dialog 
        open={mapOpen} 
        onClose={() => setMapOpen(false)} 
        maxWidth="md" 
        fullWidth
        key={`map-dialog-${mapOpen}`}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" component="span">Select Location on Map</Typography>
          <MuiIconButton size="small" onClick={() => setMapOpen(false)}>
            <CloseIcon />
          </MuiIconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {mapOpen && (
            <MapSelector
              initialLat={location.latitude}
              initialLon={location.longitude}
              onLocationSelect={handleMapSelect}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

