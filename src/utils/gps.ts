/**
 * =============================================================================
 * GPS UTILITY FUNCTIONS - CAR FINDER PWA
 * =============================================================================
 * 
 * This module contains all geographic calculations needed for the car finder:
 * - Haversine formula for distance between two GPS points
 * - Bearing calculation for direction from one point to another
 * - Heading normalization and difference calculations
 * 
 * COORDINATE SYSTEM NOTES:
 * - All latitude/longitude values are in decimal degrees
 * - Bearing is measured clockwise from true north (0° = North, 90° = East)
 * - Heading from device orientation is also clockwise from north
 * =============================================================================
 */

/**
 * Type definition for a geographic coordinate
 */
export interface Coordinates {
  latitude: number;   // Decimal degrees, positive = North
  longitude: number;  // Decimal degrees, positive = East
}

/**
 * Type definition for saved car location with metadata
 */
export interface SavedLocation extends Coordinates {
  timestamp: number;  // Unix timestamp when location was saved
  accuracy?: number;  // GPS accuracy in meters (if available)
}

/**
 * EARTH'S RADIUS
 * Used in distance calculations. Value in meters.
 * Using the mean radius as a reasonable approximation for all locations.
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * FEET PER METER
 * Conversion factor for imperial units
 */
const FEET_PER_METER = 3.28084;

/**
 * DISTANCE THRESHOLD
 * Distance in feet at which we switch display from feet to meters
 * User specified 1000ft threshold
 */
export const DISTANCE_THRESHOLD_FEET = 1000;

/**
 * =============================================================================
 * HAVERSINE FORMULA
 * =============================================================================
 * 
 * Calculates the great-circle distance between two points on Earth.
 * This is the shortest distance over the earth's surface, giving an
 * "as-the-crow-flies" distance between the points.
 * 
 * Formula breakdown:
 * 1. Convert lat/long from degrees to radians
 * 2. Calculate differences in coordinates
 * 3. Apply Haversine formula: a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlong/2)
 * 4. Calculate angular distance: c = 2·atan2(√a, √(1−a))
 * 5. Multiply by Earth's radius to get distance
 * 
 * @param point1 - Starting coordinates
 * @param point2 - Ending coordinates
 * @returns Distance in meters
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  // Convert degrees to radians
  const toRadians = (degrees: number): number => degrees * (Math.PI / 180);
  
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLong = toRadians(point2.longitude - point1.longitude);
  
  // Haversine formula components
  // 'a' represents the square of half the chord length between the points
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLong / 2) * Math.sin(deltaLong / 2);
  
  // 'c' is the angular distance in radians
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Distance in meters
  return EARTH_RADIUS_METERS * c;
}

/**
 * =============================================================================
 * BEARING CALCULATION
 * =============================================================================
 * 
 * Calculates the initial bearing (forward azimuth) from point1 to point2.
 * This is the direction you would need to travel in a straight line
 * to reach the destination.
 * 
 * Formula:
 * θ = atan2(sin(Δlong)·cos(lat2), cos(lat1)·sin(lat2) − sin(lat1)·cos(lat2)·cos(Δlong))
 * 
 * The result is normalized to 0-360 degrees where:
 * - 0° / 360° = North
 * - 90° = East
 * - 180° = South
 * - 270° = West
 * 
 * @param from - Starting coordinates (user's current position)
 * @param to - Destination coordinates (car location)
 * @returns Bearing in degrees (0-360), measured clockwise from north
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const toRadians = (degrees: number): number => degrees * (Math.PI / 180);
  const toDegrees = (radians: number): number => radians * (180 / Math.PI);
  
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLong = toRadians(to.longitude - from.longitude);
  
  // Calculate bearing using the atan2 formula
  // X component: sin(Δlong) * cos(lat2)
  const x = Math.sin(deltaLong) * Math.cos(lat2);
  
  // Y component: cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(Δlong)
  const y = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLong);
  
  // atan2 returns angle in radians from -π to π
  let bearing = toDegrees(Math.atan2(x, y));
  
  // Normalize to 0-360 range
  // Add 360 and use modulo to handle negative values
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

/**
 * =============================================================================
 * HEADING NORMALIZATION
 * =============================================================================
 * 
 * Normalizes any angle to the 0-360 degree range.
 * Handles both negative values and values > 360.
 * 
 * Examples:
 * - normalizeHeading(-90) returns 270
 * - normalizeHeading(450) returns 90
 * - normalizeHeading(180) returns 180
 * 
 * @param heading - Input angle in degrees (any value)
 * @returns Normalized angle in degrees (0-360)
 */
export function normalizeHeading(heading: number): number {
  // Handle negative values by adding 360 until positive
  while (heading < 0) heading += 360;
  // Use modulo to bring values > 360 into range
  return heading % 360;
}

/**
 * =============================================================================
 * RELATIVE HEADING CALCULATION
 * =============================================================================
 * 
 * Calculates the angle the arrow should point relative to the user's
 * current facing direction.
 * 
 * In COMPASS MODE (deviceHeading provided):
 * - If user is facing north (deviceHeading = 0) and car is east (bearing = 90),
 *   the arrow should point right (relative = 90)
 * - If user turns to face east (deviceHeading = 90) and car is still east,
 *   the arrow should point straight ahead (relative = 0)
 * 
 * In SIMPLE MODE (deviceHeading = 0):
 * - Arrow always shows the absolute bearing (north-up orientation)
 * - User mentally adjusts based on their own orientation
 * 
 * @param bearing - Direction to the car in degrees (0-360, from north)
 * @param deviceHeading - User's current facing direction (0-360, from north)
 *                        Pass 0 for simple mode (north-up)
 * @returns Relative angle in degrees (0-360) for arrow rotation
 */
export function calculateRelativeHeading(bearing: number, deviceHeading: number): number {
  // The relative heading is simply the difference between where the car is
  // and where the user is facing
  const relative = bearing - deviceHeading;
  
  // Normalize to 0-360 range
  return normalizeHeading(relative);
}

/**
 * =============================================================================
 * DISTANCE FORMATTING
 * =============================================================================
 * 
 * Formats distance for display with appropriate units.
 * - Under 1000ft: displays in feet
 * - Over 1000ft: displays in meters
 * 
 * This threshold was specified by the user for the ideal user experience.
 * 
 * @param meters - Distance in meters
 * @returns Object with formatted value and unit string
 */
export function formatDistance(meters: number): { value: string; unit: string } {
  const feet = meters * FEET_PER_METER;
  
  if (feet < DISTANCE_THRESHOLD_FEET) {
    // Display in feet for short distances
    return {
      value: Math.round(feet).toLocaleString(),
      unit: 'ft'
    };
  } else {
    // Display in meters for longer distances
    // Round to nearest 10 meters for cleaner display
    const roundedMeters = Math.round(meters / 10) * 10;
    return {
      value: roundedMeters.toLocaleString(),
      unit: 'm'
    };
  }
}

/**
 * =============================================================================
 * TIMESTAMP FORMATTING
 * =============================================================================
 * 
 * Formats a Unix timestamp into a human-readable date/time string.
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Dec 12, 2024 at 3:45 PM")
 */
export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(timestamp));
}

/**
 * =============================================================================
 * CARDINAL DIRECTION
 * =============================================================================
 * 
 * Converts a bearing in degrees to a cardinal direction string.
 * Useful for debugging and accessibility features.
 * 
 * @param bearing - Bearing in degrees (0-360)
 * @returns Cardinal direction string (N, NE, E, SE, S, SW, W, NW)
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  // Each direction covers 45 degrees, offset by 22.5 degrees for centered ranges
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
