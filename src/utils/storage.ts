/**
 * =============================================================================
 * LOCAL STORAGE UTILITIES - CAR FINDER PWA
 * =============================================================================
 * 
 * Simple localStorage wrapper for persisting car location data.
 * Handles JSON serialization/deserialization and error cases.
 * 
 * Storage is kept minimal (~10-20 lines as specified) while being robust.
 * =============================================================================
 */

import { SavedLocation } from './gps';

/**
 * STORAGE KEY
 * The key used in localStorage for the saved car location.
 * Namespaced to avoid conflicts with other apps.
 */
const STORAGE_KEY = 'carfinder_saved_location';

/**
 * Saves the car location to localStorage.
 * Serializes the location object to JSON.
 * 
 * @param location - The location object to save
 * @returns true if saved successfully, false if storage failed
 */
export function saveCarLocation(location: SavedLocation): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    return true;
  } catch (error) {
    // Storage might be full or disabled
    console.error('[Storage] Failed to save location:', error);
    return false;
  }
}

/**
 * Retrieves the saved car location from localStorage.
 * 
 * @returns The saved location object, or null if not found/invalid
 */
export function getCarLocation(): SavedLocation | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Storage] Failed to read location:', error);
    return null;
  }
}

/**
 * Clears the saved car location from localStorage.
 */
export function clearCarLocation(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Checks if a car location is currently saved.
 * 
 * @returns true if a location is saved, false otherwise
 */
export function hasCarLocation(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
