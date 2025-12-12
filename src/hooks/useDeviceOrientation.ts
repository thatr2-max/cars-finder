/**
 * =============================================================================
 * DEVICE ORIENTATION HOOK - CAR FINDER PWA
 * =============================================================================
 * 
 * Custom React hook for accessing device compass heading.
 * Provides the direction the device is facing in degrees from north.
 * 
 * COMPASS DATA SOURCES:
 * - iOS: Uses webkitCompassHeading (true north)
 * - Android: Uses alpha with screen orientation adjustment
 * 
 * PERMISSION HANDLING:
 * - iOS 13+ requires explicit permission request via DeviceOrientationEvent.requestPermission()
 * - Android grants permission automatically on user gesture
 * 
 * FALLBACK STRATEGY:
 * - If compass unavailable, isAvailable = false
 * - Parent component should offer "Simple Mode" as alternative
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Type definitions for the hook's return value
 */
interface DeviceOrientationState {
  /** Current compass heading in degrees (0-360, 0 = North) */
  heading: number | null;
  /** Whether device orientation is available and working */
  isAvailable: boolean;
  /** Whether compass data is being received */
  isActive: boolean;
  /** Whether we need to request permission (iOS 13+) */
  needsPermission: boolean;
  /** Error message if orientation access failed */
  error: string | null;
}

interface DeviceOrientationHook extends DeviceOrientationState {
  /** Request permission and start listening (required on iOS 13+) */
  requestPermission: () => Promise<boolean>;
  /** Start listening for orientation updates */
  startListening: () => void;
  /** Stop listening for orientation updates */
  stopListening: () => void;
}

/**
 * Check if we're on iOS and need to request permission
 * iOS 13+ requires explicit permission for DeviceOrientationEvent
 */
function checkNeedsPermission(): boolean {
  return (
    typeof DeviceOrientationEvent !== 'undefined' &&
    // @ts-ignore - requestPermission is iOS-specific
    typeof DeviceOrientationEvent.requestPermission === 'function'
  );
}

/**
 * Custom hook for device orientation/compass access
 * 
 * @returns DeviceOrientationHook object with heading data and control functions
 * 
 * USAGE:
 * const { heading, isAvailable, requestPermission, startListening } = useDeviceOrientation();
 */
export function useDeviceOrientation(): DeviceOrientationHook {
  // State for heading and status
  const [heading, setHeading] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [needsPermission, setNeedsPermission] = useState<boolean>(checkNeedsPermission());
  const [error, setError] = useState<string | null>(null);
  
  // Track if listener is attached
  const listenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  
  /**
   * Handle device orientation events
   * Extracts compass heading from the event data
   * 
   * @param event - DeviceOrientationEvent from browser
   */
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let compassHeading: number | null = null;
    
    // iOS: Use webkitCompassHeading (already in degrees from true north)
    // @ts-ignore - webkitCompassHeading is iOS-specific
    if (event.webkitCompassHeading !== undefined) {
      // @ts-ignore
      compassHeading = event.webkitCompassHeading;
    }
    // Android/Other: Use alpha (rotation around z-axis)
    // Alpha is 0 when device points north
    else if (event.alpha !== null) {
      // Alpha gives rotation around z-axis
      // On Android, alpha is 0 when pointing north
      // We may need to adjust based on screen orientation
      let alpha = event.alpha;
      
      // Adjust for screen orientation
      const screenOrientation = window.screen?.orientation?.angle || 0;
      compassHeading = (360 - alpha + screenOrientation) % 360;
    }
    
    if (compassHeading !== null) {
      setHeading(compassHeading);
      setIsAvailable(true);
      setError(null);
    } else {
      // No compass data available
      setIsAvailable(false);
    }
  }, []);
  
  /**
   * Request permission for device orientation (iOS 13+)
   * Must be called in response to user interaction (click/tap)
   * 
   * @returns Promise<boolean> - true if permission granted
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Check if we need permission (iOS 13+)
    if (!checkNeedsPermission()) {
      // No permission needed, start listening directly
      setNeedsPermission(false);
      return true;
    }
    
    try {
      // @ts-ignore - requestPermission is iOS-specific
      const permission = await DeviceOrientationEvent.requestPermission();
      
      if (permission === 'granted') {
        setNeedsPermission(false);
        setError(null);
        return true;
      } else {
        setError('Compass permission was denied. Simple mode will be used instead.');
        setIsAvailable(false);
        return false;
      }
    } catch (err) {
      console.error('[Orientation] Permission request failed:', err);
      setError('Unable to access compass. Simple mode will be used instead.');
      setIsAvailable(false);
      return false;
    }
  }, []);
  
  /**
   * Start listening for orientation updates
   */
  const startListening = useCallback(() => {
    // Check if DeviceOrientationEvent is supported
    if (typeof DeviceOrientationEvent === 'undefined') {
      setIsAvailable(false);
      setError('Device orientation is not supported by your browser.');
      return;
    }
    
    // Remove existing listener if any
    if (listenerRef.current) {
      window.removeEventListener('deviceorientation', listenerRef.current);
    }
    
    // Create and attach new listener
    listenerRef.current = handleOrientation;
    window.addEventListener('deviceorientation', handleOrientation, true);
    setIsActive(true);
    
    // Set a timeout to check if we're actually receiving data
    setTimeout(() => {
      if (heading === null) {
        // No heading received after 2 seconds - compass likely unavailable
        setIsAvailable(false);
      }
    }, 2000);
  }, [handleOrientation, heading]);
  
  /**
   * Stop listening for orientation updates
   */
  const stopListening = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('deviceorientation', listenerRef.current);
      listenerRef.current = null;
    }
    setIsActive(false);
  }, []);
  
  /**
   * Cleanup effect
   * Removes event listener when component unmounts
   */
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener('deviceorientation', listenerRef.current);
      }
    };
  }, []);
  
  return {
    heading,
    isAvailable,
    isActive,
    needsPermission,
    error,
    requestPermission,
    startListening,
    stopListening,
  };
}
