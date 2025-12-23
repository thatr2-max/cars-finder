/**
 * =============================================================================
 * GOOGLE GEOLOCATION API - SUPER PRECISE MODE
 * =============================================================================
 * 
 * Uses Google's Geolocation API for enhanced accuracy via WiFi/cell towers.
 * User provides their own API key stored locally - no server costs.
 * =============================================================================
 */

const GOOGLE_API_STORAGE_KEY = 'carfinder_google_api_key';
const SUPER_PRECISE_MODE_KEY = 'carfinder_super_precise_mode';

/**
 * Google Geolocation API response interface
 */
interface GoogleGeolocationResponse {
  location: {
    lat: number;
    lng: number;
  };
  accuracy: number;
}

/**
 * Save Google API key to localStorage
 */
export function saveGoogleApiKey(apiKey: string): boolean {
  try {
    localStorage.setItem(GOOGLE_API_STORAGE_KEY, apiKey);
    return true;
  } catch (error) {
    console.error('[GoogleGeo] Failed to save API key:', error);
    return false;
  }
}

/**
 * Get Google API key from localStorage
 */
export function getGoogleApiKey(): string | null {
  try {
    return localStorage.getItem(GOOGLE_API_STORAGE_KEY);
  } catch (error) {
    console.error('[GoogleGeo] Failed to read API key:', error);
    return null;
  }
}

/**
 * Clear Google API key from localStorage
 */
export function clearGoogleApiKey(): void {
  localStorage.removeItem(GOOGLE_API_STORAGE_KEY);
}

/**
 * Check if Google API key is configured
 */
export function hasGoogleApiKey(): boolean {
  return !!getGoogleApiKey();
}

/**
 * Save Super Precise Mode preference
 */
export function setSuperPreciseMode(enabled: boolean): void {
  try {
    localStorage.setItem(SUPER_PRECISE_MODE_KEY, JSON.stringify(enabled));
  } catch (error) {
    console.error('[GoogleGeo] Failed to save preference:', error);
  }
}

/**
 * Get Super Precise Mode preference
 */
export function getSuperPreciseMode(): boolean {
  try {
    const value = localStorage.getItem(SUPER_PRECISE_MODE_KEY);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    return false;
  }
}

/**
 * Call Google Geolocation API for enhanced precision
 * Uses WiFi and cell tower data for more accurate positioning
 */
export async function getGoogleGeolocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  const apiKey = getGoogleApiKey();
  
  if (!apiKey) {
    console.error('[GoogleGeo] No API key configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          considerIp: true,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[GoogleGeo] API error:', response.status, errorData);
      throw new Error(errorData?.error?.message || `API error: ${response.status}`);
    }

    const data: GoogleGeolocationResponse = await response.json();

    return {
      latitude: data.location.lat,
      longitude: data.location.lng,
      accuracy: data.accuracy,
    };
  } catch (error) {
    console.error('[GoogleGeo] Failed to get location:', error);
    throw error;
  }
}
