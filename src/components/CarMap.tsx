/**
 * =============================================================================
 * CAR MAP COMPONENT
 * =============================================================================
 * 
 * Leaflet + OpenStreetMap integration for visual car finding.
 * Shows:
 * - Car location as a red/orange pin
 * - User location as a pulsing blue dot
 * - Accuracy circle around user position
 * =============================================================================
 */

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
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

/**
 * Component to auto-fit map bounds to show both markers
 */
function MapBoundsHandler({ 
  carLocation, 
  userLocation 
}: { 
  carLocation: CarMapProps['carLocation']; 
  userLocation: CarMapProps['userLocation'];
}) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      const bounds = L.latLngBounds(
        [carLocation.latitude, carLocation.longitude],
        [userLocation.latitude, userLocation.longitude]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    } else {
      map.setView([carLocation.latitude, carLocation.longitude], 17);
    }
  }, [map, carLocation, userLocation]);

  return null;
}

export function CarMap({ carLocation, userLocation, accuracy }: CarMapProps) {
  const center = useMemo(() => {
    if (userLocation) {
      return [
        (carLocation.latitude + userLocation.latitude) / 2,
        (carLocation.longitude + userLocation.longitude) / 2,
      ] as [number, number];
    }
    return [carLocation.latitude, carLocation.longitude] as [number, number];
  }, [carLocation, userLocation]);

  return (
<div className="w-full h-64 rounded-xl overflow-hidden border border-border/50 shadow-lg" style={{ minHeight: '256px' }}>
      <MapContainer
        center={center}
        zoom={17}
        style={{ width: '100%', height: '100%', minHeight: '256px' }}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Dark-themed map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Auto-fit bounds */}
        <MapBoundsHandler carLocation={carLocation} userLocation={userLocation} />
        
        {/* Car marker */}
        <Marker
          position={[carLocation.latitude, carLocation.longitude]}
          icon={carIcon}
        />
        
        {/* User position and accuracy */}
        {userLocation && (
          <>
            {/* Accuracy circle */}
            {accuracy && (
              <Circle
                center={[userLocation.latitude, userLocation.longitude]}
                radius={accuracy}
                pathOptions={{
                  color: 'hsl(200, 100%, 50%)',
                  fillColor: 'hsl(200, 100%, 50%)',
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
            )}
            
            {/* User marker */}
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={userIcon}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
