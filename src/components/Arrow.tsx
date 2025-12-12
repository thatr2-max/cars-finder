/**
 * =============================================================================
 * 3D ARROW COMPONENT - CAR FINDER PWA
 * =============================================================================
 * 
 * A visually striking 3D-style arrow that points toward the saved car location.
 * Uses CSS transforms and gradients to create a floating, glowing effect.
 * 
 * VISUAL DESIGN:
 * - Electric blue gradient for the arrow body
 * - Glowing shadow effect that pulses
 * - 3D depth using transforms and layered shadows
 * - Smooth rotation animation using CSS transitions
 * 
 * PROPS:
 * - rotation: The angle the arrow should point (0 = up, 90 = right, etc.)
 * - isActive: Whether the arrow should show the pulsing glow animation
 * =============================================================================
 */

import React from 'react';

interface ArrowProps {
  /** Rotation angle in degrees (0 = pointing up/north) */
  rotation: number;
  /** Whether to show the animated glow effect */
  isActive?: boolean;
}

/**
 * 3D Arrow Component
 * 
 * Renders a large, centered arrow with 3D visual effects.
 * The arrow rotates to point toward the target direction.
 * 
 * @param rotation - Angle in degrees (0 = up, clockwise positive)
 * @param isActive - Whether to show pulse animation (default true)
 */
export function Arrow({ rotation, isActive = true }: ArrowProps) {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* 
        OUTER GLOW RING
        Creates a subtle ambient glow behind the arrow
        Uses the animate-pulse-glow class for breathing effect
      */}
      <div 
        className={`absolute inset-0 rounded-full bg-primary/5 ${isActive ? 'animate-pulse-glow' : ''}`}
        style={{
          boxShadow: isActive 
            ? '0 0 60px hsl(200 100% 50% / 0.3), 0 0 100px hsl(200 100% 50% / 0.1)'
            : 'none'
        }}
      />
      
      {/* 
        ARROW CONTAINER
        Applies the rotation transform
        Uses smooth transition for natural-feeling rotation
      */}
      <div 
        className="relative arrow-transition"
        style={{
          transform: `rotate(${rotation}deg)`,
          // Smooth rotation with slight easing
          transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 
          ARROW SVG
          Custom SVG arrow with gradient fill and glow effects
          Size: 180x180 for maximum visibility
        */}
        <svg 
          width="180" 
          height="180" 
          viewBox="0 0 100 100" 
          className={isActive ? 'animate-glow-pulse' : ''}
        >
          {/* GRADIENT DEFINITIONS */}
          <defs>
            {/* 
              Main arrow gradient
              Goes from bright cyan at tip to deeper blue at base
              Creates sense of depth and direction
            */}
            <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(190 100% 60%)" />
              <stop offset="50%" stopColor="hsl(200 100% 50%)" />
              <stop offset="100%" stopColor="hsl(210 100% 40%)" />
            </linearGradient>
            
            {/* 
              Glow filter for soft edges
              Combines blur with brightness for neon effect
            */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* 
              Drop shadow for 3D depth
              Offset slightly down and right for floating effect
            */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="hsl(200 100% 50%)" floodOpacity="0.5" />
            </filter>
          </defs>
          
          {/* 
            SHADOW LAYER
            Darker version of arrow offset downward
            Creates illusion of the arrow floating above surface
          */}
          <path
            d="M 50 5 L 75 50 L 60 50 L 60 90 L 40 90 L 40 50 L 25 50 Z"
            fill="hsl(200 100% 30% / 0.3)"
            transform="translate(3, 6)"
          />
          
          {/* 
            MAIN ARROW PATH
            Arrowhead pointing up with rectangular body
            Coordinates form an upward-pointing arrow shape:
            - Tip at (50, 5)
            - Wings at (25, 50) and (75, 50)
            - Body sides at x=40 and x=60
            - Base at y=90
          */}
          <path
            d="M 50 5 L 75 50 L 60 50 L 60 90 L 40 90 L 40 50 L 25 50 Z"
            fill="url(#arrowGradient)"
            filter="url(#glow)"
            stroke="hsl(190 100% 70%)"
            strokeWidth="1"
          />
          
          {/* 
            HIGHLIGHT OVERLAY
            Adds a bright edge along the left side of the arrow
            Creates 3D beveled appearance
          */}
          <path
            d="M 50 8 L 28 48 L 42 48 L 42 88"
            fill="none"
            stroke="hsl(190 100% 80% / 0.5)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* 
            CENTER LINE DETAIL
            Subtle line down the center for added dimension
          */}
          <line
            x1="50"
            y1="15"
            x2="50"
            y2="85"
            stroke="hsl(200 100% 70% / 0.3)"
            strokeWidth="1"
          />
        </svg>
      </div>
      
      {/* 
        DIRECTION INDICATOR RING
        Subtle compass ring showing cardinal directions
        Helps user orient themselves
      */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Compass ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="48" 
            fill="none" 
            stroke="hsl(200 100% 50% / 0.15)" 
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
          
          {/* Cardinal direction markers */}
          <text x="50" y="8" textAnchor="middle" fill="hsl(200 100% 60% / 0.5)" fontSize="6" fontFamily="sans-serif">N</text>
          <text x="95" y="52" textAnchor="middle" fill="hsl(200 100% 60% / 0.3)" fontSize="5" fontFamily="sans-serif">E</text>
          <text x="50" y="98" textAnchor="middle" fill="hsl(200 100% 60% / 0.3)" fontSize="5" fontFamily="sans-serif">S</text>
          <text x="5" y="52" textAnchor="middle" fill="hsl(200 100% 60% / 0.3)" fontSize="5" fontFamily="sans-serif">W</text>
        </svg>
      </div>
    </div>
  );
}
