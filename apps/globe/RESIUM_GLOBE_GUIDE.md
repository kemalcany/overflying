# ResiumGlobe Component - Complete Implementation Guide

This document provides a comprehensive overview of the ResiumGlobe component implementation.

## 📁 Project Structure

```
apps/globe/src/components/ResiumGlobe/
├── index.tsx                      # Main component export
├── types.ts                       # TypeScript interfaces
├── README.md                      # Component documentation
├── components/
│   └── RectangleCursor.tsx       # Visual rectangle overlay
├── hooks/
│   ├── useResiumViewer.ts        # Viewer lifecycle management
│   ├── useAreaSelection.ts       # Area selection logic
│   └── useKeyboardControls.ts    # Keyboard event handling
└── utils/
    ├── calculations.ts            # Coordinate & distance calculations
    └── constants.ts               # Configuration constants
```

## ✅ Implementation Checklist

### Phase 1: Basic Setup ✓
- [x] Create component structure with Resium Viewer
- [x] Configure viewer to remove all default UI elements
- [x] Accept cesiumAccessToken from props and configure Cesium.Ion
- [x] Make component responsive to container size
- [x] Add proper TypeScript types

### Phase 2: Resource Management ✓
- [x] Implement `isActivated` prop logic
- [x] Handle viewer initialization and destruction
- [x] Ensure proper cleanup on unmount
- [x] Support toggling active state multiple times

### Phase 3: Rectangle Cursor ✓
- [x] Create overlay rectangle component in center of view
- [x] Ensure rectangle is visible against all backgrounds
- [x] Make rectangle size configurable via props
- [x] Ensure rectangle doesn't interfere with camera controls

### Phase 4: Selection Logic ✓
- [x] Add SPACE key listener
- [x] Implement ray casting from rectangle corners
- [x] Calculate Cartesian3 positions for all corners
- [x] Convert to Cartographic coordinates
- [x] Calculate bounds and center point

### Phase 5: Area Calculations ✓
- [x] Calculate camera height above ground
- [x] Determine ground-level dimensions of selected area
- [x] Estimate area in km²
- [x] Package data into AreaSelection interface
- [x] Call onAreaSelected callback

### Phase 6: Additional Features ✓
- [x] Implement onCameraChanged callback using camera.moveEnd
- [x] Add error handling and onError callback
- [x] Handle edge cases (horizon, poles, anti-meridian)
- [x] Add loading states

### Phase 7: Polish ✓
- [x] Add comprehensive comments
- [x] Write usage examples
- [x] Add README with setup instructions
- [x] Demo page with all features
- [x] Proper TypeScript types throughout

## 🚀 Quick Start

### 1. Import the Component

```tsx
import { ResiumGlobe } from '@/components/ResiumGlobe';
import type { AreaSelection, CameraState } from '@/components/ResiumGlobe';
```

### 2. Basic Usage

```tsx
export default function MyPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ResiumGlobe
        cesiumAccessToken={process.env.NEXT_PUBLIC_CESIUM_TOKEN!}
        isActivated={true}
        onAreaSelected={(data) => console.log(data)}
      />
    </div>
  );
}
```

### 3. With State Management

```tsx
'use client';

import { useState } from 'react';
import { ResiumGlobe, AreaSelection } from '@/components/ResiumGlobe';

export default function MyPage() {
  const [isActive, setIsActive] = useState(true);
  const [selection, setSelection] = useState<AreaSelection | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ResiumGlobe
        cesiumAccessToken={process.env.NEXT_PUBLIC_CESIUM_TOKEN!}
        isActivated={isActive}
        onAreaSelected={setSelection}
      />

      <button onClick={() => setIsActive(!isActive)}>
        {isActive ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}
```

## 🎯 Key Features

### 1. Self-Contained Design
- Component fills whatever container it's placed in
- No external configuration needed except the Cesium token
- Manages its own lifecycle and resources

### 2. Resource Management
```tsx
// Pause rendering to save resources
<ResiumGlobe isActivated={false} ... />

// Resume rendering
<ResiumGlobe isActivated={true} ... />
```

### 3. Area Selection
When the user presses **SPACE**, the component:
1. Casts rays from the four corners of the rectangle cursor
2. Finds where they intersect the globe
3. Calculates the geographic bounds
4. Computes the ground area in km²
5. Returns detailed selection data via callback

```tsx
onAreaSelected={(data: AreaSelection) => {
  console.log('Center:', data.center.cartographic);
  console.log('Bounds:', data.bounds);
  console.log('Area:', data.groundArea.estimatedAreaKm2, 'km²');
  console.log('Dimensions:', data.groundArea.width, 'x', data.groundArea.height, 'm');
}}
```

### 4. Camera Tracking
```tsx
onCameraChanged={(state: CameraState) => {
  console.log('Height:', state.height);
  console.log('Heading:', state.heading);
  console.log('Pitch:', state.pitch);
}}
```

### 5. Error Handling
```tsx
onError={(error: Error) => {
  console.error('Globe error:', error.message);
  // Handle errors (e.g., rectangle beyond horizon)
}}
```

## 📊 Data Structures

### AreaSelection
```typescript
{
  center: {
    cartesian: Cesium.Cartesian3,
    cartographic: {
      longitude: number,  // degrees
      latitude: number,   // degrees
      height: number      // meters
    }
  },
  bounds: {
    north: number,  // degrees
    south: number,
    east: number,
    west: number
  },
  cameraHeight: number,  // meters
  zoomLevel: number,     // 0-20
  groundArea: {
    width: number,          // meters
    height: number,         // meters
    estimatedAreaKm2: number
  },
  corners: {
    topLeft: Cesium.Cartographic | null,
    topRight: Cesium.Cartographic | null,
    bottomLeft: Cesium.Cartographic | null,
    bottomRight: Cesium.Cartographic | null
  }
}
```

## 🎨 Customization

### Custom Rectangle Size
```tsx
<ResiumGlobe
  rectangleCursorSize={{
    width: 300,
    height: 250
  }}
  ...
/>
```

### Custom Starting Position
```tsx
<ResiumGlobe
  defaultCameraPosition={{
    longitude: -74.0060,  // New York
    latitude: 40.7128,
    height: 5000000       // 5,000 km
  }}
  ...
/>
```

## 🔧 Technical Details

### Coordinate System
- All internal calculations use **radians**
- Output data uses **degrees** for user convenience
- Cartesian3 positions use WGS84 ellipsoid

### Distance Calculations
- Uses haversine formula for accuracy
- Accounts for Earth's curvature
- Works correctly at any scale (meters to thousands of km)

### Area Calculations
- Uses Cesium's built-in ellipsoid surface area calculation
- Accurate for large areas (accounts for curvature)
- Returns results in km²

### Edge Cases Handled
1. **Rectangle beyond horizon**: Returns error via `onError`
2. **High altitude views**: Correctly calculates even at extreme heights
3. **Polar regions**: Handles coordinate wrapping
4. **Anti-meridian**: Correctly handles 180°/-180° crossing
5. **Invalid coordinates**: Validates all data before processing

## 🎮 User Controls

### Mouse/Trackpad
- **Left-drag**: Rotate globe
- **Scroll**: Zoom in/out
- **Right-drag**: Pan view
- **Double-click**: Zoom to point

### Keyboard
- **SPACE**: Select the area covered by the rectangle cursor

## ⚡ Performance Tips

1. **Use isActivated wisely**: Set to `false` when globe isn't visible
2. **Single instance**: Don't render multiple globes simultaneously
3. **Lazy loading**: Use Next.js dynamic imports with `ssr: false`
4. **Container size**: Use explicit dimensions, avoid percentage-based sizing

## 🧪 Testing the Component

### Run the Development Server
```bash
cd apps/globe
npm run dev
# or
bun dev
```

Visit [http://localhost:3001](http://localhost:3001)

### Test Checklist
- [ ] Globe renders correctly
- [ ] Rectangle cursor appears in center
- [ ] Camera controls work (drag, zoom, pan)
- [ ] SPACE key selects area
- [ ] Selection data is accurate
- [ ] Pause/Resume button works
- [ ] No console errors
- [ ] Works at different zoom levels
- [ ] Works in different locations (poles, equator)
- [ ] Error handling works (select area beyond horizon)

## 🐛 Troubleshooting

### Globe doesn't appear
- Check that Cesium token is valid
- Verify container has explicit height
- Check browser console for errors

### Rectangle cursor not visible
- Ensure `isActivated={true}`
- Check z-index conflicts
- Verify viewport has sufficient size

### Selection doesn't work
- Make sure rectangle is over visible globe
- Check browser console for errors
- Try zooming in closer to the surface

### Performance issues
- Set `isActivated={false}` when not in use
- Check for multiple instances
- Verify browser GPU acceleration is enabled

## 📚 Resources

- [Cesium Documentation](https://cesium.com/learn/)
- [Resium Documentation](https://resium.reearth.io/)
- [Component README](src/components/ResiumGlobe/README.md)

## 🎓 Architecture Decisions

### Why Hooks?
Custom hooks separate concerns and make testing easier:
- `useResiumViewer`: Manages viewer lifecycle
- `useAreaSelection`: Handles selection logic
- `useKeyboardControls`: Manages keyboard events

### Why Emotion CSS?
- Already in project dependencies
- Great TypeScript support
- Scoped styles prevent conflicts
- CSS-in-JS with excellent DX

### Why Dynamic Import?
- Cesium requires browser APIs
- Next.js SSR would fail without it
- Reduces initial bundle size

### Why Ref-based Viewer Access?
- Resium provides ref-based access pattern
- Allows direct Cesium API access
- Maintains React component lifecycle

## 🔮 Future Enhancements

Potential features to add:
- [ ] Multiple selection rectangles
- [ ] Configurable selection shapes (circle, polygon)
- [ ] Touch gesture support for mobile
- [ ] Export selection as GeoJSON
- [ ] Terrain height sampling
- [ ] 3D buildings and imagery layers
- [ ] Custom markers and overlays
- [ ] Animation controls
- [ ] Screenshot capability
- [ ] Measure distance tool

## 📝 License

This component uses CesiumJS which requires attribution and a valid Ion token. See [Cesium licensing](https://cesium.com/legal/terms-of-service/) for details.

---

**Built with ❤️ using Cesium, Resium, and Next.js**
