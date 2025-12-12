/**
 * =============================================================================
 * CAR FINDER COMPONENT - MAIN APPLICATION LOGIC
 * =============================================================================
 * 
 * The core component that handles all car finding functionality:
 * - Setting and storing car location
 * - Tracking user position in real-time
 * - Calculating direction and distance to car
 * - Managing compass vs simple mode
 * 
 * STATE MANAGEMENT:
 * - savedLocation: Car's stored GPS coordinates (persisted in localStorage)
 * - mode: Current view ('set' for saving, 'find' for navigation)
 * - useSimpleMode: Whether to use GPS-only direction (no compass)
 * 
 * USER FLOW:
 * 1. User opens app → sees "Set Car Location" button
 * 2. User taps button → GPS captured and stored
 * 3. User goes shopping...
 * 4. User returns → taps "Find My Car"
 * 5. Arrow points toward car, distance updates in real-time
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Arrow } from './Arrow';
import { CarMap } from './CarMap';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import {
  SavedLocation,
  calculateDistance,
  calculateBearing,
  calculateRelativeHeading,
  formatDistance,
  formatTimestamp,
  getCardinalDirection,
} from '../utils/gps';
import {
  saveCarLocation,
  getCarLocation,
  clearCarLocation,
} from '../utils/storage';
import {
  showCarSavedNotification,
  dismissCarNotification,
} from '../utils/notifications';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Trash2, Compass, Map as MapIcon, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Application modes
 * - 'set': Initial state, prompting user to save car location
 * - 'find': Navigation mode, showing arrow pointing to car
 */
type AppMode = 'set' | 'find';

/**
 * Main CarFinder Component
 * 
 * Manages the entire car finding workflow including:
 * - Location capture and storage
 * - Real-time GPS tracking
 * - Compass/simple mode navigation
 * - Distance and direction calculations
 */
export function CarFinder() {
  // =========================================================================
  // STATE DECLARATIONS
  // =========================================================================
  
  /**
   * Saved car location from localStorage
   * null means no car location is currently saved
   */
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);
  
  /**
   * Current application mode
   * 'set': Show the save location UI
   * 'find': Show navigation arrow UI
   */
  const [mode, setMode] = useState<AppMode>('set');
  
  /**
   * Simple mode toggle
   * When true, arrow shows GPS bearing (north-up orientation)
   * When false, arrow adjusts based on device compass heading
   */
  const [useSimpleMode, setUseSimpleMode] = useState<boolean>(false);
  
  /**
   * Map view toggle
   * When true, shows map instead of arrow
   */
  const [showMap, setShowMap] = useState<boolean>(false);
  
  /**
   * Loading state for location capture
   */
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // =========================================================================
  // CUSTOM HOOKS
  // =========================================================================
  
  /**
   * Geolocation hook for GPS access
   * Provides position tracking and one-shot position capture
   */
  const {
    position,
    accuracy,
    error: geoError,
    isTracking,
    isLoading: isGeoLoading,
    startTracking,
    stopTracking,
    getBestReading,
  } = useGeolocation();
  
  /**
   * Track if user has entered arrival zone (for one-time celebration)
   */
  const [hasArrived, setHasArrived] = useState(false);
  
  /**
   * Device orientation hook for compass heading
   * Provides the direction the device is facing
   */
  const {
    heading: compassHeading,
    isAvailable: isCompassAvailable,
    needsPermission,
    error: compassError,
    requestPermission,
    startListening: startCompass,
    stopListening: stopCompass,
  } = useDeviceOrientation();
  
  // =========================================================================
  // EFFECTS
  // =========================================================================
  
  /**
   * URL search params for deep linking from notifications
   */
  const [searchParams, setSearchParams] = useSearchParams();
  
  /**
   * Load saved location on component mount and handle deep link
   * Checks localStorage for previously saved car location
   * If ?action=find is present, auto-start navigation
   */
  useEffect(() => {
    const stored = getCarLocation();
    if (stored) {
      setSavedLocation(stored);
      
      // Check for deep link from notification
      const action = searchParams.get('action');
      if (action === 'find') {
        // Clear the query param to prevent re-triggering
        setSearchParams({}, { replace: true });
        // Auto-start navigation
        handleStartNavigation();
      } else {
        setMode('set'); // Keep in 'set' mode, user can switch to 'find'
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  /**
   * Auto-enable simple mode if compass is unavailable
   * This provides a fallback when device orientation isn't supported
   */
  useEffect(() => {
    if (!isCompassAvailable && mode === 'find') {
      setUseSimpleMode(true);
    }
  }, [isCompassAvailable, mode]);
  
  // =========================================================================
  // CALCULATED VALUES
  // =========================================================================
  
  /**
   * Calculate distance to car in meters
   * Returns null if we don't have both positions
   */
  const distanceMeters = position && savedLocation
    ? calculateDistance(position, savedLocation)
    : null;
  
  /**
   * Calculate bearing (direction) to car
   * Returns angle in degrees from north (0-360)
   */
  const bearingToCar = position && savedLocation
    ? calculateBearing(position, savedLocation)
    : null;
  
  /**
   * Calculate arrow rotation based on mode
   * 
   * In COMPASS MODE: Arrow rotates relative to device heading
   * - If facing east and car is east, arrow points up (0°)
   * - If facing north and car is east, arrow points right (90°)
   * 
   * In SIMPLE MODE: Arrow shows absolute bearing
   * - Arrow points the direction the car is (north-up orientation)
   * - User must mentally account for their own orientation
   */
  const arrowRotation = bearingToCar !== null
    ? useSimpleMode
      ? bearingToCar // Simple mode: show absolute bearing
      : calculateRelativeHeading(bearingToCar, compassHeading ?? 0) // Compass mode: relative to heading
    : 0;
  
  /**
   * Format distance for display
   * Switches between feet and meters based on threshold
   */
  const formattedDistance = distanceMeters !== null
    ? formatDistance(distanceMeters)
    : { value: '--', unit: '' };
  
  /**
   * Get cardinal direction to car for accessibility
   */
  const cardinalDirection = bearingToCar !== null
    ? getCardinalDirection(bearingToCar)
    : '';
  
  /**
   * Determine arrival zone status
   * - Under 5m: You found it!
   * - Under 15m: You're close
   * - Otherwise: Show distance normally
   */
  const arrivalStatus = distanceMeters !== null
    ? distanceMeters < 5
      ? 'found'
      : distanceMeters < 15
        ? 'close'
        : 'navigating'
    : 'navigating';

  /**
   * Arrival detection - trigger celebration when first entering arrival zone
   */
  useEffect(() => {
    if (distanceMeters !== null && distanceMeters < 5 && !hasArrived && mode === 'find') {
      setHasArrived(true);
      // Celebration haptic pattern
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }
    // Reset arrived state when leaving find mode
    if (mode === 'set') {
      setHasArrived(false);
    }
  }, [distanceMeters, hasArrived, mode]);
  
  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  
  /**
   * Handle saving car location with best-reading capture
   * 
   * 1. Takes multiple GPS readings
   * 2. Selects the one with best accuracy
   * 3. Stores in localStorage with timestamp and accuracy
   * 4. Shows confirmation toast with precision info
   */
  const handleSaveLocation = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Take 3 readings and pick the best one
      const bestReading = await getBestReading(3);
      
      if (bestReading) {
        const location: SavedLocation = {
          latitude: bestReading.coords.latitude,
          longitude: bestReading.coords.longitude,
          timestamp: Date.now(),
          accuracy: bestReading.accuracy,
        };
        
        const saved = saveCarLocation(location);
        
        if (saved) {
          setSavedLocation(location);
          // Haptic feedback on successful save
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50]);
          }
          const accuracyFeet = Math.round(bestReading.accuracy * 3.28084);
          toast.success('Car location saved!', {
            description: `Precision: ±${accuracyFeet}ft`,
          });
          
          // Show persistent notification with "Find Car" action
          showCarSavedNotification();
        } else {
          toast.error('Failed to save location', {
            description: 'Storage may be full or disabled.',
          });
        }
      }
    } catch (err) {
      console.error('[CarFinder] Failed to save location:', err);
      toast.error('Failed to get location', {
        description: 'Please check your GPS settings.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [getBestReading]);
  
  /**
   * Handle starting navigation mode
   * 
   * 1. Requests compass permission if needed (iOS)
   * 2. Starts GPS tracking
   * 3. Starts compass listening
   * 4. Switches to 'find' mode
   */
  const handleStartNavigation = useCallback(async () => {
    // Request compass permission on iOS if needed
    if (needsPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setUseSimpleMode(true);
        toast.info('Using simple mode', {
          description: 'Compass unavailable. Arrow shows GPS direction.',
        });
      }
    }
    
    // Start GPS tracking
    startTracking();
    
    // Start compass if available and permission granted
    if (isCompassAvailable && !needsPermission) {
      startCompass();
    }
    
    setMode('find');
  }, [needsPermission, requestPermission, startTracking, isCompassAvailable, startCompass]);
  
  /**
   * Handle returning to set mode
   * Stops all tracking and returns to main screen
   */
  const handleBackToSet = useCallback(() => {
    stopTracking();
    stopCompass();
    setMode('set');
  }, [stopTracking, stopCompass]);
  
  /**
   * Handle clearing saved location
   * Removes from localStorage and resets UI
   */
  const handleClearLocation = useCallback(() => {
    clearCarLocation();
    setSavedLocation(null);
    stopTracking();
    stopCompass();
    setMode('set');
    toast.success('Location cleared');
    
    // Dismiss the notification
    dismissCarNotification();
  }, [stopTracking, stopCompass]);
  
  /**
   * Trigger haptic feedback if available
   * Uses the Vibration API for tactile feedback on interactions
   */
  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  /**
   * Toggle between compass and simple mode
   * No toast - just haptic feedback to avoid spam when quickly cycling
   */
  const handleToggleMode = useCallback(() => {
    triggerHaptic(30);
    setUseSimpleMode(prev => !prev);
  }, [triggerHaptic]);

  /**
   * Toggle between map and arrow view
   */
  const handleToggleMap = useCallback(() => {
    triggerHaptic(30);
    setShowMap(prev => !prev);
  }, [triggerHaptic]);
  
  // =========================================================================
  // RENDER
  // =========================================================================
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-background">
      {/* 
        HEADER SECTION
        App title and status indicators
      */}
      <header className="w-full text-center pt-safe">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Car Finder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === 'set' 
            ? 'Save your car location' 
            : 'Navigate to your car'}
        </p>
      </header>
      
      {/* 
        MAIN CONTENT AREA
        Changes based on current mode
      */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md py-8">
        {mode === 'set' ? (
          /* ===== SET LOCATION MODE ===== */
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            {savedLocation ? (
              /* Location already saved - show saved info */
              <>
                <div className="glass rounded-2xl p-6 border border-border/50 text-center neon-border">
                  <div className="flex items-center justify-center gap-2 text-primary mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Location Saved</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTimestamp(savedLocation.timestamp)}
                  </p>
                  {savedLocation.accuracy && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Accuracy: ±{Math.round(savedLocation.accuracy)}m
                    </p>
                  )}
                </div>
                
                <Button
                  onClick={handleStartNavigation}
                  size="lg"
                  className="h-20 w-64 text-xl font-semibold rounded-2xl shadow-glow"
                >
                  <Navigation className="w-6 h-6 mr-3" />
                  Find My Car
                </Button>
                
                <Button
                  onClick={handleSaveLocation}
                  variant="secondary"
                  size="lg"
                  className="h-14 w-64 rounded-xl"
                  disabled={isSaving || isGeoLoading}
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  {isSaving ? 'Saving...' : 'Update Location'}
                </Button>
              </>
            ) : (
              /* No location saved - show prominent save button */
              <>
                <div className="text-center mb-4">
                  <MapPin className="w-16 h-16 mx-auto text-primary/50 mb-4" />
                  <p className="text-muted-foreground">
                    Tap the button below when you park
                  </p>
                </div>
                
                <Button
                  onClick={handleSaveLocation}
                  size="lg"
                  className="h-24 w-72 text-xl font-semibold rounded-2xl shadow-glow-lg"
                  disabled={isSaving || isGeoLoading}
                >
                  <MapPin className="w-7 h-7 mr-3" />
                  {isSaving ? 'Getting Location...' : 'Set Car Location'}
                </Button>
              </>
            )}
            
            {/* GPS Error Display */}
            {geoError && (
              <div className="flex items-center gap-2 text-destructive text-sm animate-fade-in">
                <AlertTriangle className="w-4 h-4" />
                <span>{geoError}</span>
              </div>
            )}
          </div>
        ) : (
          /* ===== FIND MODE - NAVIGATION ===== */
          <div className="flex flex-col items-center gap-6 animate-scale-in">
            {/* Arrival Zone Display */}
            {arrivalStatus === 'found' ? (
              <div className="flex flex-col items-center gap-4 animate-scale-in">
                <div className="w-32 h-32 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                  <Check className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-primary text-glow">You found it!</h2>
                <p className="text-muted-foreground text-center">
                  Your car should be right here
                </p>
              </div>
            ) : arrivalStatus === 'close' ? (
              <div className="flex flex-col items-center gap-4">
                <Arrow rotation={arrowRotation} isActive={isTracking} />
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-primary">Almost there!</h2>
                  <p className="text-muted-foreground mt-1">
                    Within ~{Math.round((distanceMeters ?? 0) * 3.28084)}ft
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Map or Arrow view */}
                {showMap && savedLocation ? (
                  <CarMap
                    carLocation={savedLocation}
                    userLocation={position}
                    accuracy={accuracy}
                  />
                ) : (
                  <Arrow rotation={arrowRotation} isActive={isTracking} />
                )}
                
                {/* Distance display */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-bold text-foreground text-glow tabular-nums">
                      {formattedDistance.value}
                    </span>
                    <span className="text-2xl text-muted-foreground">
                      {formattedDistance.unit}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {cardinalDirection && `Head ${cardinalDirection}`}
                    {!useSimpleMode && compassHeading !== null && !showMap && (
                      <span className="ml-2 text-primary/70">
                        • Compass active
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}
            
            {/* Mode toggle - only show when not in arrival zone */}
            {arrivalStatus === 'navigating' && (
              <div className="flex gap-2">
                {/* Map toggle */}
                <Button
                  onClick={handleToggleMap}
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                >
                  {showMap ? (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Show Arrow
                    </>
                  ) : (
                    <>
                      <MapIcon className="w-4 h-4 mr-2" />
                      Show Map
                    </>
                  )}
                </Button>
                
                {/* Compass/Simple mode toggle - only when arrow is shown */}
                {!showMap && (
                  <Button
                    onClick={handleToggleMode}
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                  >
                    {useSimpleMode ? (
                      <>
                        <Compass className="w-4 h-4 mr-2" />
                        Compass
                      </>
                    ) : (
                      <>
                        <MapIcon className="w-4 h-4 mr-2" />
                        Simple
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            
            {/* Compass error/warning */}
            {compassError && !useSimpleMode && !showMap && arrivalStatus === 'navigating' && (
              <p className="text-xs text-warning text-center max-w-xs">
                {compassError}
              </p>
            )}
            
            {/* GPS accuracy indicator */}
            {accuracy && arrivalStatus !== 'found' && (
              <p className="text-xs text-muted-foreground/70">
                GPS: ±{Math.round(accuracy * 3.28084)}ft
              </p>
            )}
            
            {/* Back button */}
            <Button
              onClick={handleBackToSet}
              variant="ghost"
              size="sm"
              className="mt-4"
            >
              ← Back
            </Button>
          </div>
        )}
      </main>
      
      {/* 
        FOOTER SECTION
        Clear location button (only when location is saved)
      */}
      <footer className="w-full max-w-md pb-safe">
        {savedLocation && (
          <Button
            onClick={handleClearLocation}
            variant="ghost"
            size="sm"
            className="w-full text-destructive/70 hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Saved Location
          </Button>
        )}
      </footer>
    </div>
  );
}
