"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { GeoLocation, GeocodeResult, searchLocation } from "../lib/geolocation";

interface Props {
  location: GeoLocation;
  loading?: boolean;
  error?: string | null;
  permissionDenied?: boolean;
  onRequestBrowserLocation: () => void;
  onSelectLocation: (result: GeocodeResult) => void;
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
        <Paper sx={{ p: 2, width: 300 }}>
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

            {/* Search */}
            <TextField
              size="small"
              placeholder="Search city..."
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
              <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
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
              <Typography variant="caption" color="text.secondary" textAlign="center">
                No results found
              </Typography>
            )}

            {/* Current Location Info */}
            <Box sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                Current: {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Popover>
    </>
  );
}
