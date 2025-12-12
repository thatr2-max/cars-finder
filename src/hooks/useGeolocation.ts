/**
 * =============================================================================
 * GEOLOCATION HOOK - CAR FINDER PWA
 * =============================================================================
 * 
 * Custom React hook for accessing device GPS location.
 * Provides both one-shot and continuous location watching.
 * 
 * FEATURES:
 * - Permission status tracking
 * - Continuous position updates via watchPosition
 * - Error handling with user-friendly messages
 * - Automatic cleanup on unmount
 * 
 * GEOLOCATION API NOTES:
 * - Requires HTTPS in production (or localhost for development)
 * - User must grant permission on first use
 * - Accuracy depends on device capabilities (GPS, WiFi, cell towers)
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinates } from '../utils/gps';

/**
 * Type definitions for the hook's return value
 */
interface GeolocationState {
  /** Current position coordinates, null if not yet acquired */
  position: Coordinates | null;
  /** GPS accuracy in meters */
  accuracy: number | null;
  /** Error message if location access failed */
  error: string | null;
  /** Whether we're actively tracking position */
  isTracking: boolean;
  /** Whether we're waiting for first position */
  isLoading: boolean;
}

interface GeolocationHook extends GeolocationState {
  /** Start continuous position tracking */
  startTracking: () => void;
  /** Stop position tracking */
  stopTracking: () => void;
  /** Get current position once (one-shot) */
  getCurrentPosition: () => Promise<Coordinates | null>;
}

/**
 * Geolocation options for the API
 * enableHighAccuracy: Use GPS if available (more accurate but slower)
 * timeout: Max time to wait for position (ms)
 * maximumAge: Accept cached position if this recent (ms)
 */
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,        // 15 seconds timeout
  maximumAge: 0,         // Always get fresh position
};

/**
 * Convert GeolocationPositionError to user-friendly message
 */
function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable location permissions in your browser settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Unable to determine your location. Please check that GPS is enabled.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again in an open area.';
    default:
      return 'An unknown error occurred while getting your location.';
  }
}

/**
 * Custom hook for geolocation access
 * 
 * @returns GeolocationHook object with position data and control functions
 * 
 * USAGE:
 * const { position, error, isTracking, startTracking, stopTracking } = useGeolocation();
 */
export function useGeolocation(): GeolocationHook {
  // State for position and status
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref to store the watch ID for cleanup
  const watchIdRef = useRef<number | null>(null);
  
  /**
   * Success callback for geolocation updates
   * Updates position state with new coordinates
   */
  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    setAccuracy(pos.coords.accuracy);
    setError(null);
    setIsLoading(false);
  }, []);
  
  /**
   * Error callback for geolocation failures
   * Converts error code to user-friendly message
   */
  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(getErrorMessage(err));
    setIsLoading(false);
  }, []);
  
  /**
   * Start continuous position tracking
   * Uses watchPosition for real-time updates as user moves
   */
  const startTracking = useCallback(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    
    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    setIsLoading(true);
    setIsTracking(true);
    setError(null);
    
    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      GEO_OPTIONS
    );
  }, [handleSuccess, handleError]);
  
  /**
   * Stop position tracking
   * Clears the watch and resets tracking state
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setIsLoading(false);
  }, []);
  
  /**
   * Get current position once (one-shot request)
   * Useful for saving car location
   * 
   * @returns Promise resolving to coordinates or null on error
   */
  const getCurrentPosition = useCallback(async (): Promise<Coordinates | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: Coordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setPosition(coords);
          setAccuracy(pos.coords.accuracy);
          setIsLoading(false);
          resolve(coords);
        },
        (err) => {
          handleError(err);
          resolve(null);
        },
        GEO_OPTIONS
      );
    });
  }, [handleError]);
  
  /**
   * Cleanup effect
   * Stops tracking when component unmounts
   */
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  
  return {
    position,
    accuracy,
    error,
    isTracking,
    isLoading,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}
