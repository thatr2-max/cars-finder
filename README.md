# Car Finder PWA

A progressive web app that helps you find your parked car using GPS and device orientation.

## Features

- **Save Car Location**: Capture and store your car's GPS coordinates with a single tap
- **Find Your Car**: Navigate back using a 3D compass arrow that points toward your car
- **Real-time Distance**: See the distance to your car update as you walk
- **Compass Mode**: Arrow rotates based on which direction you're facing
- **Simple Mode**: Fallback GPS-only direction when compass is unavailable
- **Offline Support**: Works offline after first load (PWA with service worker)
- **Installable**: Add to your home screen for app-like experience

## Technical Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **localStorage** for data persistence
- **Geolocation API** for GPS positioning
- **DeviceOrientationEvent** for compass heading

## File Structure

```
src/
├── components/
│   ├── Arrow.tsx          # 3D compass arrow with CSS animations
│   ├── CarFinder.tsx      # Main app logic and UI
│   └── ui/
│       └── button.tsx     # Enhanced button component
├── hooks/
│   ├── useGeolocation.ts      # GPS position tracking hook
│   └── useDeviceOrientation.ts # Compass heading hook
├── utils/
│   ├── gps.ts             # Haversine formula, bearing calculations
│   └── storage.ts         # localStorage wrapper
└── pages/
    └── Index.tsx          # Entry point, service worker registration

public/
├── manifest.json          # PWA manifest
├── service-worker.js      # Offline caching
└── icons/
    ├── icon-192.png       # App icon (small)
    └── icon-512.png       # App icon (large)
```

## GPS Calculations

### Haversine Formula
Calculates the "as-the-crow-flies" distance between two GPS points:

```typescript
const distance = calculateDistance(
  { latitude: 40.7128, longitude: -74.0060 },  // Point A
  { latitude: 40.7580, longitude: -73.9855 }   // Point B
);
// Returns distance in meters
```

### Bearing Calculation
Determines the direction from current position to destination:

```typescript
const bearing = calculateBearing(currentPosition, carPosition);
// Returns degrees (0-360) where 0 = North, 90 = East, etc.
```

### Relative Heading
Calculates arrow rotation relative to device orientation:

```typescript
const arrowAngle = calculateRelativeHeading(bearingToCar, compassHeading);
// Returns the angle the arrow should point
```

## API Permissions

### Geolocation
- Requires HTTPS (or localhost)
- User permission prompt on first use
- Falls back gracefully if denied

### Device Orientation
- iOS 13+ requires explicit permission request
- Automatically switches to Simple Mode if unavailable
- Permission requested on user interaction (tap)

## User Flow

1. User opens app → Location permission requested
2. User taps "Set Car Location" → GPS captured and saved
3. User goes shopping...
4. User returns and taps "Find My Car" → Arrow appears
5. Arrow points toward car, distance updates in real-time
6. If compass unavailable → "Use Simple Mode" shows GPS direction

## Modes

### Compass Mode (Default)
- Arrow rotates as you turn your device
- Point phone forward and follow the arrow
- Works like a real compass

### Simple Mode
- Arrow shows absolute bearing (north-up)
- You mentally account for your own orientation
- Use when compass is unreliable or unavailable

## Error Handling

- **Permission Denied**: Shows clear message, offers Simple Mode
- **GPS Timeout**: Encourages user to try in open area
- **Compass Unavailable**: Automatically enables Simple Mode
- **Same Location**: Shows 0 distance gracefully

## Installation

### As a PWA (Recommended)
1. Open the app in your mobile browser
2. iOS: Safari → Share → Add to Home Screen
3. Android: Chrome → Menu → Add to Home Screen

### Development
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
```

## Design System

The app uses a dark, futuristic theme with electric blue accents:

- **Background**: Near-black (#050709)
- **Primary**: Electric blue (#00a8ff)
- **Accents**: Glowing effects and neon borders
- **Typography**: Inter font family

All colors are defined as CSS variables in `index.css` and referenced via Tailwind in `tailwind.config.ts`.

## Browser Support

- Chrome (mobile & desktop)
- Safari (iOS 13+)
- Firefox
- Edge

Note: Device orientation (compass) may not work on all devices or browsers. Simple Mode provides a fallback.
