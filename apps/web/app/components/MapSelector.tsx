"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { reverseGeocode, type GeocodeResult } from "../lib/geolocation";

interface Props {
  initialLat: number;
  initialLon: number;
  onLocationSelect: (result: GeocodeResult) => void;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (result: GeocodeResult) => void }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const reversed = await reverseGeocode(lat, lng);
      onLocationSelect(
        reversed ?? {
          name: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
          country: "",
          latitude: lat,
          longitude: lng,
        }
      );
    },
  });
  return null;
}

export function MapSelector({ initialLat, initialLon, onLocationSelect }: Props) {
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const [position] = useState<[number, number]>([initialLat, initialLon]);
  const mapKey = `${initialLat}-${initialLon}-${mounted ? "mounted" : "init"}`;

  useEffect(() => {
    setMounted(true);

    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Fix default icon paths
    import("leaflet").then((leaflet) => {
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });

    return () => {
      const existingLink = document.querySelector('link[href*="leaflet.css"]');
      if (existingLink) document.head.removeChild(existingLink);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!mounted) {
    return (
      <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 400, position: "relative" }} key={mapKey}>
      <MapContainer
        key={mapKey}
        center={position}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef as any}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} />
        <MapClickHandler onLocationSelect={onLocationSelect} />
      </MapContainer>
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: 16,
          bgcolor: "background.paper",
          p: 1,
          borderRadius: 1,
          boxShadow: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Click anywhere to select location
        </Typography>
      </Box>
    </Box>
  );
}
