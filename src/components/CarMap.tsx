/**
 * =============================================================================
 * CAR MAP COMPONENT (Leaflet - direct integration)
 * =============================================================================
 *
 * Lightweight Leaflet + OpenStreetMap integration for visual car finding.
 * We avoid react-leaflet here to prevent context/render issues and have
 * full control over map lifecycle.
 *
 * Shows:
 * - Car location as a red/orange pin
 * - User location as a pulsing blue dot
 * - Accuracy circle around user position
 * - Auto-fit between car and user when both are available
 * =============================================================================
 */

import React, { useEffect, useMemo, useRef } from 'react';
import L, { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CarMapProps {
  carLocation: {
    latitude: number;
    longitude: number;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  accuracy?: number;
}

// Custom car marker icon
const carIcon = L.divIcon({
  className: 'car-marker',
  html: `<div class="car-pin">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="hsl(25, 100%, 50%)" stroke="white" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" font-size="12">🚗</text>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom user marker icon (pulsing blue dot)
const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<div class="user-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export function CarMap({ carLocation, userLocation, accuracy }: CarMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (userLocation) {
      return [
        (carLocation.latitude + userLocation.latitude) / 2,
        (carLocation.longitude + userLocation.longitude) / 2,
      ];
    }
    return [carLocation.latitude, carLocation.longitude];
  }, [carLocation, userLocation]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);

    mapRef.current = map;
    layersRef.current = layers;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, [center]);

  // Update markers and view when locations change
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // Car marker
    const carLatLng = L.latLng(carLocation.latitude, carLocation.longitude);
    L.marker(carLatLng, { icon: carIcon }).addTo(layers);

    let bounds = L.latLngBounds(carLatLng, carLatLng);

    // User marker + accuracy
    if (userLocation) {
      const userLatLng = L.latLng(userLocation.latitude, userLocation.longitude);
      L.marker(userLatLng, { icon: userIcon }).addTo(layers);

      if (accuracy) {
        L.circle(userLatLng, {
          radius: accuracy,
          color: 'hsl(200, 100%, 50%)',
          fillColor: 'hsl(200, 100%, 50%)',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(layers);
      }

      bounds.extend(userLatLng);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    } else {
      map.setView(carLatLng, 17);
    }
  }, [carLocation, userLocation, accuracy]);

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-border/50 shadow-lg" style={{ minHeight: '256px' }}>
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ minHeight: '256px' }}
      />
    </div>
  );
}
