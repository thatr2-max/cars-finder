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
import { Coordinates, calculateDistance } from '../utils/gps';

/**
 * Position reading with accuracy for smoothing
 */
interface PositionReading {
  coords: Coordinates;
  accuracy: number;
  timestamp: number;
}

/**
 * Best reading result from multi-sample capture
 */
export interface BestReadingResult {
  coords: Coordinates;
  accuracy: number;
}

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
  /** Get best reading from multiple samples */
  getBestReading: (numSamples?: number) => Promise<BestReadingResult | null>;
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

// Configuration for position smoothing
const POSITION_BUFFER_SIZE = 5;
const MOVEMENT_THRESHOLD_FACTOR = 0.5; // Only update if moved more than 50% of accuracy

/**
 * Custom hook for geolocation access with position smoothing
 * 
 * @returns GeolocationHook object with position data and control functions
 * 
 * USAGE:
 * const { position, error, isTracking, startTracking, stopTracking, getBestReading } = useGeolocation();
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
  
  // Buffer for position smoothing
  const positionBufferRef = useRef<PositionReading[]>([]);
  const lastReportedPositionRef = useRef<Coordinates | null>(null);
  
  /**
   * Calculate weighted average position from buffer
   * Positions with better accuracy get higher weight
   */
  const calculateSmoothedPosition = useCallback((buffer: PositionReading[]): { coords: Coordinates; accuracy: number } | null => {
    if (buffer.length === 0) return null;
    
    // Weight by inverse of accuracy (lower accuracy value = more accurate = higher weight)
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;
    let bestAccuracy = Infinity;
    
    for (const reading of buffer) {
      const weight = 1 / reading.accuracy;
      totalWeight += weight;
      weightedLat += reading.coords.latitude * weight;
      weightedLng += reading.coords.longitude * weight;
      bestAccuracy = Math.min(bestAccuracy, reading.accuracy);
    }
    
    return {
      coords: {
        latitude: weightedLat / totalWeight,
        longitude: weightedLng / totalWeight,
      },
      accuracy: bestAccuracy,
    };
  }, []);

  /**
   * Success callback for geolocation updates with smoothing
   * Buffers positions and only updates if significant movement detected
   */
  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    const newReading: PositionReading = {
      coords: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      },
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };
    
    // Add to buffer, keeping only last N readings
    positionBufferRef.current.push(newReading);
    if (positionBufferRef.current.length > POSITION_BUFFER_SIZE) {
      positionBufferRef.current.shift();
    }
    
    // Calculate smoothed position
    const smoothed = calculateSmoothedPosition(positionBufferRef.current);
    if (!smoothed) return;
    
    // Check if we should update (either first reading or significant movement)
    const lastPos = lastReportedPositionRef.current;
    const movementThreshold = pos.coords.accuracy * MOVEMENT_THRESHOLD_FACTOR;
    
    if (!lastPos || calculateDistance(lastPos, smoothed.coords) > movementThreshold) {
      setPosition(smoothed.coords);
      setAccuracy(smoothed.accuracy);
      lastReportedPositionRef.current = smoothed.coords;
    }
    
    setError(null);
    setIsLoading(false);
  }, [calculateSmoothedPosition]);
  
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
   * Useful for quick position checks
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
   * Get best reading from multiple GPS samples
   * Takes N readings and returns the one with best accuracy
   * 
   * @param numSamples Number of readings to take (default 3)
   * @returns Promise resolving to best reading or null on error
   */
  const getBestReading = useCallback(async (numSamples: number = 3): Promise<BestReadingResult | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    const readings: PositionReading[] = [];
    
    // Take multiple readings with a delay between each
    for (let i = 0; i < numSamples; i++) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
        });
        
        readings.push({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        
        // Small delay between readings (except last one)
        if (i < numSamples - 1) {
          await new Promise(r => setTimeout(r, 800));
        }
      } catch (err) {
        // If one reading fails, continue with others
        console.warn('[Geolocation] Sample failed:', err);
      }
    }
    
    setIsLoading(false);
    
    if (readings.length === 0) {
      setError('Failed to get any GPS readings.');
      return null;
    }
    
    // Find reading with best accuracy
    const bestReading = readings.reduce((best, current) => 
      current.accuracy < best.accuracy ? current : best
    );
    
    setPosition(bestReading.coords);
    setAccuracy(bestReading.accuracy);
    
    return {
      coords: bestReading.coords,
      accuracy: bestReading.accuracy,
    };
  }, []);
  
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
    getBestReading,
  };
}
