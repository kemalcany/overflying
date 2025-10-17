# ResiumGlobe Component

A fully self-contained React component using Resium (CesiumJS wrapper) that provides interactive 3D globe functionality with area selection capabilities.

## Features

- 🌍 **Self-Contained Design**: Fills any container, no external configuration needed
- 🎮 **Resource Management**: Control rendering with `isActivated` prop
- 🎨 **Clean UI**: All default Cesium controls removed
- 🎯 **Rectangle Cursor**: Fixed selection reticle in viewport center
- ⌨️ **Keyboard Selection**: Press SPACE to select visible area
- 📊 **Detailed Area Data**: Get bounds, dimensions, and calculated metrics
- 🎥 **Camera Tracking**: Optional camera state change callbacks
- 🛡️ **Error Handling**: Comprehensive error handling with callbacks

## Installation

This component is already set up in your project with the following dependencies:

```json
{
  "cesium": "^1.133.0",
  "resium": "1.19.0-beta.1",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1"
}
```

## Basic Usage

```tsx
import { ResiumGlobe } from '@/components/ResiumGlobe';

function App() {
  const [isGlobeActive, setIsGlobeActive] = useState(true);

  const handleAreaSelected = (areaData) => {
    console.log('Selected area:', areaData);
    // Process the selected area data
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ResiumGlobe
        cesiumAccessToken={process.env.NEXT_PUBLIC_CESIUM_TOKEN}
        isActivated={isGlobeActive}
        onAreaSelected={handleAreaSelected}
      />
    </div>
  );
}
```

## Props

### Required Props

#### `cesiumAccessToken` (string)
Your Cesium Ion access token. Get one from [Cesium Ion](https://ion.cesium.com/).

```tsx
cesiumAccessToken="your-token-here"
```

#### `isActivated` (boolean)
Controls whether the Cesium viewer is actively rendering. Set to `false` to pause rendering and save resources.

```tsx
isActivated={true}
```

### Optional Props

#### `defaultCameraPosition` (object)
Initial camera position when the globe loads.

```tsx
defaultCameraPosition={{
  longitude: -74.0060,  // New York
  latitude: 40.7128,
  height: 10000000      // 10,000 km
}}
```

**Default:**
```tsx
{
  longitude: 0,
  latitude: 0,
  height: 20000000  // 20,000 km
}
```

#### `rectangleCursorSize` (object)
Size of the selection rectangle cursor in pixels.

```tsx
rectangleCursorSize={{
  width: 300,
  height: 200
}}
```

**Default:**
```tsx
{
  width: 200,
  height: 150
}
```

#### `onAreaSelected` (function)
Callback fired when user presses SPACE to select the area covered by the rectangle cursor.

```tsx
onAreaSelected={(areaData: AreaSelection) => {
  console.log('Center:', areaData.center);
  console.log('Bounds:', areaData.bounds);
  console.log('Area:', areaData.groundArea.estimatedAreaKm2, 'km²');
}}
```

#### `onCameraChanged` (function)
Callback fired when the camera stops moving.

```tsx
onCameraChanged={(cameraState: CameraState) => {
  console.log('Camera height:', cameraState.height);
  console.log('Heading:', cameraState.heading);
}}
```

#### `onError` (function)
Callback for error handling.

```tsx
onError={(error: Error) => {
  console.error('Globe error:', error.message);
}}
```

## Data Structures

### AreaSelection

Data returned by `onAreaSelected` callback:

```typescript
interface AreaSelection {
  // Center point of the selected area
  center: {
    cartesian: Cesium.Cartesian3;
    cartographic: {
      longitude: number;  // degrees
      latitude: number;   // degrees
      height: number;     // meters
    };
  };

  // Geographic bounds of the rectangle
  bounds: {
    north: number;  // degrees
    south: number;  // degrees
    east: number;   // degrees
    west: number;   // degrees
  };

  // Camera information at time of selection
  cameraHeight: number;  // meters above ground
  zoomLevel: number;     // 0-20 scale

  // Ground-level dimensions
  groundArea: {
    width: number;          // meters
    height: number;         // meters
    estimatedAreaKm2: number; // square kilometers
  };

  // Corner positions (for advanced use)
  corners: {
    topLeft: Cesium.Cartographic | null;
    topRight: Cesium.Cartographic | null;
    bottomLeft: Cesium.Cartographic | null;
    bottomRight: Cesium.Cartographic | null;
  };
}
```

### CameraState

Data returned by `onCameraChanged` callback:

```typescript
interface CameraState {
  position: Cesium.Cartesian3;
  heading: number;  // radians
  pitch: number;    // radians
  roll: number;     // radians
  height: number;   // meters above ground
}
```

## Usage Examples

### Example 1: Basic Globe with Selection

```tsx
'use client';

import { useState } from 'react';
import { ResiumGlobe, AreaSelection } from '@/components/ResiumGlobe';

export default function GlobePage() {
  const [selectedArea, setSelectedArea] = useState<AreaSelection | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ResiumGlobe
        cesiumAccessToken={process.env.NEXT_PUBLIC_CESIUM_TOKEN!}
        isActivated={true}
        onAreaSelected={setSelectedArea}
      />

      {selectedArea && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'white',
          padding: 20,
          borderRadius: 8,
          maxWidth: 300
        }}>
          <h3>Selected Area</h3>
          <p>Center: {selectedArea.center.cartographic.latitude.toFixed(4)}°,
             {selectedArea.center.cartographic.longitude.toFixed(4)}°</p>
          <p>Area: {selectedArea.groundArea.estimatedAreaKm2.toFixed(2)} km²</p>
          <p>Dimensions: {(selectedArea.groundArea.width / 1000).toFixed(2)} ×
             {(selectedArea.groundArea.height / 1000).toFixed(2)} km</p>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Toggling Globe Active State

```tsx
'use client';

import { useState } from 'react';
import { ResiumGlobe } from '@/components/ResiumGlobe';

export default function GlobePage() {
  const [isActive, setIsActive] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ResiumGlobe
        cesiumAccessToken={process.env.NEXT_PUBLIC_CESIUM_TOKEN!}
        isActivated={isActive}
      />

      <button
        onClick={() => setIsActive(!isActive)}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '10px 20px',
          fontSize: 16
        }}
      >
        {isActive ? 'Pause' : 'Resume'} Globe
      </button>
    </div>
  );
}
```

### Example 3: Tracking Camera Movement

```tsx
'use client';

import { useState } from 'react';
import { ResiumGlobe, CameraState } from '@/components/ResiumGlobe';

export default function GlobePage() {
  const [cameraInfo, setCameraInfo] = useState<CameraState | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ResiumGlobe
        cesiumAccessToken={process.env.NEXT_PUBLIC_CESIUM_TOKEN!}
        isActivated={true}
        onCameraChanged={setCameraInfo}
      />

      {cameraInfo && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: 15,
          borderRadius: 8,
          fontFamily: 'monospace'
        }}>
          <div>Height: {(cameraInfo.height / 1000).toFixed(2)} km</div>
          <div>Heading: {(cameraInfo.heading * 180 / Math.PI).toFixed(1)}°</div>
          <div>Pitch: {(cameraInfo.pitch * 180 / Math.PI).toFixed(1)}°</div>
        </div>
      )}
    </div>
  );
}
```

### Example 4: Custom Rectangle Size and Starting Position

```tsx
'use client';

import { ResiumGlobe } from '@/components/ResiumGlobe';

export default function GlobePage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ResiumGlobe
        cesiumAccessToken={process.env.NEXT_PUBLIC_CESIUM_TOKEN!}
        isActivated={true}
        defaultCameraPosition={{
          longitude: 139.6917,  // Tokyo
          latitude: 35.6895,
          height: 5000000       // 5,000 km
        }}
        rectangleCursorSize={{
          width: 300,
          height: 250
        }}
        onAreaSelected={(data) => {
          console.log('Selected area in Tokyo region:', data);
        }}
      />
    </div>
  );
}
```

## Keyboard Controls

- **SPACE**: Select the area currently covered by the rectangle cursor

## Edge Cases Handled

The component handles several edge cases:

1. **Rectangle Beyond Horizon**: If the rectangle extends beyond the visible globe surface, an error is returned via `onError`
2. **High Altitude Views**: Works correctly even when viewing from extreme heights
3. **Polar Regions**: Coordinate calculations handle poles correctly
4. **Anti-meridian Crossing**: Properly handles selections that cross the 180°/-180° longitude line
5. **Invalid Coordinates**: Validates all coordinate data before processing

## Component Architecture

```
ResiumGlobe/
├── index.tsx                  # Main component
├── types.ts                   # TypeScript interfaces
├── README.md                  # This file
├── components/
│   └── RectangleCursor.tsx   # Visual rectangle overlay
├── hooks/
│   ├── useResiumViewer.ts    # Viewer lifecycle management
│   ├── useAreaSelection.ts   # Area selection logic
│   └── useKeyboardControls.ts # Keyboard event handling
└── utils/
    ├── calculations.ts        # Coordinate & distance calculations
    └── constants.ts           # Configuration constants
```

## Performance Notes

1. **Resource Management**: When `isActivated={false}`, the viewer stops rendering to conserve CPU/GPU resources
2. **Render Mode**: Component uses continuous rendering by default for smooth interaction
3. **Memory Cleanup**: All event listeners and resources are properly cleaned up on unmount

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Works but may have performance limitations

## Troubleshooting

### Globe doesn't render
- Ensure `cesiumAccessToken` is valid
- Check that the container has explicit width and height
- Verify Cesium assets are properly configured in your build tool

### Selection doesn't work
- Make sure `isActivated={true}`
- Check browser console for errors
- Ensure the rectangle cursor is visible over the globe

### Performance issues
- Set `isActivated={false}` when the globe isn't visible
- Reduce `rectangleCursorSize` if needed
- Check that multiple instances aren't rendering simultaneously

## License

This component uses CesiumJS which requires a valid Ion token. See [Cesium licensing](https://cesium.com/legal/terms-of-service/) for details.
