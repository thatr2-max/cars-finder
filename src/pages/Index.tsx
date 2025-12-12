/**
 * =============================================================================
 * INDEX PAGE - CAR FINDER PWA
 * =============================================================================
 * 
 * Main entry point for the application.
 * Renders the CarFinder component which contains all core functionality.
 * 
 * SEO NOTES:
 * - Title and meta tags are configured in index.html
 * - PWA manifest provides additional metadata
 * =============================================================================
 */

import React, { useEffect } from 'react';
import { CarFinder } from '@/components/CarFinder';

/**
 * Index Page Component
 * 
 * Handles:
 * - Service worker registration for PWA functionality
 * - Renders the main CarFinder component
 */
const Index: React.FC = () => {
  /**
   * Register service worker on mount
   * Enables offline functionality and "Add to Home Screen"
   */
  useEffect(() => {
    // Only register in production or when service worker is available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }
  }, []);
  
  return (
    <>
      {/* 
        Meta tags for PWA and mobile optimization
        Additional tags are in index.html
      */}
      <CarFinder />
    </>
  );
};

export default Index;
