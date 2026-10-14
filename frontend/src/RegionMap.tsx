import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Region } from "./types";

// Fix Leaflet's default icon path in bundlers (Vite/Webpack)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface RegionMapProps {
  selectedLat: number;
  selectedLon: number;
  regionName: string;
  regions: Region[];
  boundingBox?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number } | null;
  onLocationSelect: (lat: number, lon: number, name?: string) => void;
}

export function RegionMap({
  selectedLat,
  selectedLon,
  regionName,
  regions,
  boundingBox,
  onLocationSelect,
}: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const activeMarkerRef = useRef<L.Marker | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center: [selectedLat, selectedLon],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    // Elegant CartoDB Positron / OSM tiles for clean climate visualization
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    // Click handler to pick custom point
    map.on("click", (e: L.LeafletMouseEvent) => {
      const lat = Math.round(e.latlng.lat * 10000) / 10000;
      const lon = Math.round(e.latlng.lng * 10000) / 10000;
      onLocationSelect(lat, lon, `Custom (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center, marker, and bounding box whenever props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous marker
    if (activeMarkerRef.current) {
      activeMarkerRef.current.remove();
      activeMarkerRef.current = null;
    }

    // Custom pulse icon for selected point
    const pulseIcon = L.divIcon({
      className: "custom-pulse-marker",
      html: `<div class="pulse-pin"></div><div class="pulse-ring"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Add active marker
    const marker = L.marker([selectedLat, selectedLon], {
      icon: pulseIcon,
      draggable: true,
      title: regionName,
    }).addTo(map);

    marker.bindPopup(`<b>${regionName}</b><br/>Lat: ${selectedLat.toFixed(4)}°, Lon: ${selectedLon.toFixed(4)}°`).openPopup();

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      const lat = Math.round(pos.lat * 10000) / 10000;
      const lon = Math.round(pos.lng * 10000) / 10000;
      onLocationSelect(lat, lon, `Custom (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`);
    });

    activeMarkerRef.current = marker;

    // Handle Bounding Box if present
    if (rectRef.current) {
      rectRef.current.remove();
      rectRef.current = null;
    }

    if (boundingBox) {
      const bounds: L.LatLngBoundsExpression = [
        [boundingBox.min_lat, boundingBox.min_lon],
        [boundingBox.max_lat, boundingBox.max_lon],
      ];
      const rect = L.rectangle(bounds, {
        color: "#ca5532",
        weight: 2,
        fillColor: "#ca5532",
        fillOpacity: 0.15,
      }).addTo(map);
      rectRef.current = rect;
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 8 });
    } else {
      map.panTo([selectedLat, selectedLon]);
    }
  }, [selectedLat, selectedLon, regionName, boundingBox]);

  return (
    <div className="map-container-wrapper">
      <div className="map-header-bar">
        <div className="map-title-info">
          <span className="map-dot"></span>
          <span><b>Region Map:</b> Click anywhere or drag the marker to analyze custom coordinates</span>
        </div>
        <div className="map-coords-badge">
          {selectedLat.toFixed(3)}°N, {selectedLon.toFixed(3)}°E
        </div>
      </div>
      <div ref={containerRef} className="leaflet-map-canvas" />
    </div>
  );
}
