# ResiumGlobe Component Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     page.tsx (Demo)                         │
│  - State management (selection, camera, errors)             │
│  - UI controls and data display                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ props
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ResiumGlobe/index.tsx                      │
│  - Main component logic                                     │
│  - Cesium Ion token setup                                   │
│  - Camera initialization                                    │
│  - Coordinates custom hooks                                 │
└─────┬───────────────────────────┬──────────────────┬────────┘
      │                           │                  │
      │ hooks                     │ components       │ utils
      ▼                           ▼                  ▼
┌─────────────┐          ┌──────────────┐   ┌──────────────┐
│   Hooks     │          │  Components  │   │   Utils      │
│             │          │              │   │              │
│ • Viewer    │          │ • Rectangle  │   │ • Calcs      │
│ • Selection │          │   Cursor     │   │ • Constants  │
│ • Keyboard  │          │              │   │              │
└─────────────┘          └──────────────┘   └──────────────┘
```

## Data Flow

```
User Interaction
       │
       ├─ Mouse Drag ──────────────────┐
       │                                │
       ├─ Scroll Wheel ─────────────────┤
       │                                ▼
       └─ SPACE Key ───────────► useKeyboardControls
                                         │
                    ┌────────────────────┘
                    │
                    ▼
              useAreaSelection
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
   Ray Cast    Convert       Calculate
   Corners     Coords        Metrics
       │            │            │
       └────────────┼────────────┘
                    │
                    ▼
              AreaSelection
              (returned data)
                    │
                    ▼
            onAreaSelected()
            callback to parent
```

## Hook Responsibilities

### useResiumViewer
```
Responsibilities:
├─ Viewer lifecycle management
├─ Resource activation/deactivation
├─ Camera move event handling
└─ Cleanup on unmount

Triggers:
├─ isActivated prop changes
├─ Camera moveEnd events
└─ Component unmount

Outputs:
└─ Camera state updates via onCameraChanged()
```

### useAreaSelection
```
Responsibilities:
├─ Calculate rectangle corners in screen space
├─ Cast rays from corners to globe surface
├─ Convert Cartesian to Cartographic coordinates
├─ Calculate geographic bounds
├─ Compute ground dimensions
└─ Calculate area in km²

Triggers:
└─ handleSelection() called by keyboard hook

Outputs:
├─ AreaSelection data via onAreaSelected()
└─ Errors via onError()
```

### useKeyboardControls
```
Responsibilities:
├─ Listen for keyboard events
├─ Filter for SPACE key
└─ Prevent default scrolling behavior

Triggers:
└─ SPACE key pressed

Outputs:
└─ Calls onSelectionKeyPressed()
```

## State Management

```
┌──────────────────────────────────────────────────┐
│              Parent Component                    │
│              (page.tsx)                          │
│                                                  │
│  State:                                          │
│  ├─ isGlobeActive: boolean                       │
│  ├─ selectedArea: AreaSelection | null           │
│  ├─ cameraState: CameraState | null              │
│  └─ error: string | null                         │
│                                                  │
│  Props passed down:                              │
│  ├─ cesiumAccessToken                            │
│  ├─ isActivated ◄─────── isGlobeActive          │
│  ├─ onAreaSelected ────► setSelectedArea        │
│  ├─ onCameraChanged ───► setCameraState         │
│  └─ onError ───────────► setError               │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│           ResiumGlobe Component                  │
│                                                  │
│  Internal State:                                 │
│  └─ viewerRef: Cesium.Viewer reference           │
│                                                  │
│  No local state - fully controlled by parent     │
└──────────────────────────────────────────────────┘
```

## Calculation Pipeline

```
1. User presses SPACE
         │
         ▼
2. Get canvas dimensions
   Get rectangle cursor size
         │
         ▼
3. Calculate screen coordinates
   of rectangle corners
   ┌─────────────────────┐
   │  TL      TR         │  TL = Top Left
   │    [RECT]           │  TR = Top Right
   │  BL      BR         │  BL = Bottom Left
   └─────────────────────┘  BR = Bottom Right
         │
         ▼
4. Cast rays from corners
   to globe surface
   (using camera.pickEllipsoid)
         │
         ▼
5. Convert Cartesian3 to
   Cartographic (lat/lon/height)
         │
         ▼
6. Validate all coordinates
   (check for NaN, valid ranges)
         │
         ▼
7. Calculate bounds
   north = max(latitudes)
   south = min(latitudes)
   east = max(longitudes)
   west = min(longitudes)
         │
         ▼
8. Calculate center point
   centerLon = (east + west) / 2
   centerLat = (north + south) / 2
         │
         ▼
9. Calculate ground dimensions
   width = haversine(TL, TR)
   height = haversine(TL, BL)
         │
         ▼
10. Calculate area (km²)
    using Cesium's ellipsoid
    surface area calculation
         │
         ▼
11. Package into AreaSelection
    and call callback
         │
         ▼
12. Parent receives data
    and updates UI
```

## Coordinate System Flow

```
Screen Space (pixels)
    x: 0 to canvasWidth
    y: 0 to canvasHeight
         │
         │ camera.pickEllipsoid()
         ▼
Cartesian3 (3D space)
    x, y, z in meters from
    Earth's center
         │
         │ Cartographic.fromCartesian()
         ▼
Cartographic (radians)
    longitude: -π to π
    latitude: -π/2 to π/2
    height: meters
         │
         │ CesiumMath.toDegrees()
         ▼
Geographic (degrees)
    longitude: -180° to 180°
    latitude: -90° to 90°
    height: meters
```

## Error Handling Flow

```
Error Sources:
├─ Ray casting fails (beyond horizon)
├─ Invalid coordinates (NaN)
├─ Out of bounds coordinates
└─ Cesium API errors

         │
         ▼
    Catch in hook
         │
         ▼
    Validate error
         │
         ▼
  Create Error object
         │
         ▼
   Call onError()
   callback
         │
         ▼
  Parent handles
  (displays message)
```

## Resource Management

```
isActivated = true
         │
         ▼
┌─────────────────────┐
│  Viewer Active      │
│  ├─ Rendering ON    │
│  ├─ Events ON       │
│  └─ GPU Active      │
└─────────────────────┘

         vs

isActivated = false
         │
         ▼
┌─────────────────────┐
│  Viewer Paused      │
│  ├─ Rendering OFF   │
│  ├─ Events OFF      │
│  └─ GPU Idle        │
└─────────────────────┘
```

## Component Lifecycle

```
Mount
  │
  ├─ 1. Set Cesium Ion token
  │
  ├─ 2. Render Viewer component
  │      (Cesium initializes)
  │
  ├─ 3. Set initial camera position
  │
  ├─ 4. Register camera listeners
  │      (useResiumViewer)
  │
  └─ 5. Register keyboard listener
         (useKeyboardControls)

Runtime
  │
  ├─ User interactions
  │   ├─ Mouse/trackpad (Cesium handles)
  │   └─ Keyboard (our hook handles)
  │
  ├─ Props changes
  │   ├─ isActivated toggle
  │   └─ Other prop updates
  │
  └─ State updates trigger callbacks

Unmount
  │
  ├─ 1. Remove keyboard listener
  │
  ├─ 2. Remove camera listener
  │
  └─ 3. Cesium cleanup
         (automatic via Resium)
```

## Performance Considerations

```
Optimization Strategies:

1. Dynamic Import
   ├─ Cesium loads only in browser
   ├─ No SSR bundle bloat
   └─ Faster initial page load

2. Render Control
   ├─ isActivated prop
   ├─ Disable rendering when hidden
   └─ Save CPU/GPU resources

3. Event Throttling
   ├─ Camera moveEnd (not move)
   ├─ Reduces callback frequency
   └─ Better performance

4. Ref-based Access
   ├─ Direct Cesium API access
   ├─ No React re-renders
   └─ Efficient updates

5. Calculation Caching
   ├─ useCallback for handlers
   ├─ Prevent recreation
   └─ Memory efficient
```

## Type Safety

```
TypeScript Coverage:

├─ Props (ResiumGlobeProps)
│   ├─ Required props enforced
│   ├─ Optional props typed
│   └─ Callbacks typed
│
├─ Return Types (AreaSelection, CameraState)
│   ├─ Complete data structures
│   ├─ Nested object types
│   └─ Union types (e.g., | null)
│
├─ Internal Types (CesiumViewerRef)
│   ├─ Ref typing
│   ├─ Cesium types imported
│   └─ Hook parameter types
│
└─ Utility Types
    ├─ Function parameters
    ├─ Return types
    └─ Generic types
```

## Testing Strategy

```
Manual Testing:
├─ Visual testing in browser
├─ Interaction testing (mouse, keyboard)
├─ Data validation (console logs)
└─ Edge case scenarios

Type Checking:
├─ TypeScript compilation
├─ No type errors
└─ Strict mode enabled

Build Verification:
├─ Next.js build succeeds
├─ No runtime errors
└─ Bundle size check

Future Automated Testing:
├─ Unit tests (Jest + React Testing Library)
├─ Integration tests (Cypress/Playwright)
└─ E2E scenarios
```

## File Dependency Graph

```
index.tsx
  │
  ├─ imports: types.ts
  ├─ imports: components/RectangleCursor.tsx
  │              └─ imports: utils/constants.ts
  │
  ├─ imports: hooks/useResiumViewer.ts
  │              ├─ imports: types.ts
  │              └─ uses: viewerRef
  │
  ├─ imports: hooks/useAreaSelection.ts
  │              ├─ imports: types.ts
  │              ├─ imports: utils/calculations.ts
  │              │              └─ imports: utils/constants.ts
  │              └─ uses: viewerRef
  │
  ├─ imports: hooks/useKeyboardControls.ts
  │              └─ imports: utils/constants.ts
  │
  └─ imports: utils/constants.ts
```

## Extension Points

```
Future Enhancement Areas:

1. Custom Selection Shapes
   └─ Extend useAreaSelection
      ├─ Add shape prop
      └─ Implement different raycasting

2. Multiple Selections
   └─ Extend state management
      ├─ Array of selections
      └─ Toggle/clear individual

3. Custom Overlays
   └─ Add overlay component
      ├─ Markers
      ├─ Labels
      └─ Custom graphics

4. Advanced Camera Control
   └─ Extend useResiumViewer
      ├─ Animation support
      ├─ Flight paths
      └─ Preset positions

5. Data Export
   └─ Add utility functions
      ├─ GeoJSON export
      ├─ KML export
      └─ Screenshot capture
```

---

This architecture supports:
- ✅ Separation of concerns
- ✅ Testability
- ✅ Maintainability
- ✅ Extensibility
- ✅ Type safety
- ✅ Performance
