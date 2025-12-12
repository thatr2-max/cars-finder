/**
 * =============================================================================
 * NOTIFICATION UTILITIES
 * =============================================================================
 * 
 * Handles push notification functionality for the Car Finder PWA.
 * Allows showing a persistent "Find Car" notification when location is saved.
 * =============================================================================
 */

/**
 * Check if notifications are supported in this browser
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Request permission to show notifications
 * Returns true if permission is granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.log('[Notifications] Not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('[Notifications] Permission previously denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[Notifications] Error requesting permission:', error);
    return false;
  }
}

/**
 * Show the "Car Location Saved" notification with a "Find Car" action
 * This notification stays in the user's tray until they need it
 */
export async function showCarSavedNotification(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Use type assertion for extended NotificationOptions with actions
    const options: NotificationOptions & { actions?: Array<{ action: string; title: string }> } = {
      body: 'Tap to navigate back to your car',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'car-location', // Replaces any existing notification with same tag
      requireInteraction: true, // Keeps notification visible until user interacts
      actions: [
        {
          action: 'find',
          title: 'Find Car',
        },
      ],
    };
    
    await registration.showNotification('🚗 Car Location Saved', options as NotificationOptions);

    console.log('[Notifications] Car saved notification shown');
    return true;
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
    return false;
  }
}

/**
 * Dismiss the car location notification
 * Called when user clears their saved location
 */
export async function dismissCarNotification(): Promise<void> {
  if (!isNotificationSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications({ tag: 'car-location' });
    
    notifications.forEach((notification) => {
      notification.close();
    });

    console.log('[Notifications] Car notification dismissed');
  } catch (error) {
    console.error('[Notifications] Error dismissing notification:', error);
  }
}
