/** @jsxImportSource @emotion/react */
'use client';

import React, { useRef, useEffect } from 'react';
import { css } from '@emotion/react';
import { Viewer } from 'resium';
import * as Cesium from 'cesium';
import { ResiumGlobeProps, CesiumViewerRef } from './types';
import { RectangleCursor } from './components/RectangleCursor';
import { useResiumViewer } from './hooks/useResiumViewer';
import { useAreaSelection } from './hooks/useAreaSelection';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { DEFAULT_CAMERA_POSITION, DEFAULT_RECTANGLE_CURSOR_SIZE } from './utils/constants';

// Container styles
const containerStyle = css`
  width: 100%;
  height: 100%;
  position: relative;
`;

const viewerContainerStyle = css`
  width: 100%;
  height: 100%;
`;

/**
 * ResiumGlobe - A self-contained React component using Resium (CesiumJS wrapper)
 *
 * This component provides a fully functional 3D globe with area selection capabilities.
 * It fills its container, manages its own resources, and communicates with the parent
 * app through props and event callbacks.
 *
 * Key Features:
 * - Self-contained design (fills container)
 * - Resource management via isActivated prop
 * - Clean UI (no default Cesium controls)
 * - Rectangle cursor for area selection
 * - SPACE key to select visible area
 * - Detailed area data with bounds and dimensions
 *
 * @example
 * ```tsx
 * <ResiumGlobe
 *   cesiumAccessToken={process.env.CESIUM_TOKEN}
 *   isActivated={true}
 *   onAreaSelected={(data) => console.log(data)}
 *   onCameraChanged={(state) => console.log(state)}
 * />
 * ```
 */
export const ResiumGlobe: React.FC<ResiumGlobeProps> = ({
  cesiumAccessToken,
  isActivated,
  defaultCameraPosition = DEFAULT_CAMERA_POSITION,
  rectangleCursorSize = DEFAULT_RECTANGLE_CURSOR_SIZE,
  onAreaSelected,
  onCameraChanged,
  onError,
}) => {
  const viewerRef = useRef<CesiumViewerRef>(null);

  // Set Cesium Ion token
  useEffect(() => {
    Cesium.Ion.defaultAccessToken = cesiumAccessToken;
  }, [cesiumAccessToken]);

  // Initialize camera position
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    // Set initial camera position
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        defaultCameraPosition.longitude,
        defaultCameraPosition.latitude,
        defaultCameraPosition.height
      ),
    });
  }, [defaultCameraPosition]);

  // Use custom hooks for functionality
  useResiumViewer({
    viewerRef,
    isActivated,
    onCameraChanged,
    onError,
  });

  const { handleSelection } = useAreaSelection({
    viewerRef,
    rectangleWidth: rectangleCursorSize.width,
    rectangleHeight: rectangleCursorSize.height,
    onAreaSelected,
    onError,
  });

  useKeyboardControls({
    onSelectionKeyPressed: handleSelection,
    isActivated,
  });

  return (
    <div css={containerStyle}>
      <div css={viewerContainerStyle}>
        <Viewer
          ref={viewerRef}
          full
          // Disable all default UI elements
          animation={false}
          timeline={false}
          homeButton={false}
          navigationHelpButton={false}
          baseLayerPicker={false}
          geocoder={false}
          sceneModePicker={false}
          selectionIndicator={false}
          infoBox={false}
          fullscreenButton={false}
          // Additional configurations
          requestRenderMode={false}
          maximumRenderTimeChange={Infinity}
        />
      </div>

      {/* Rectangle cursor overlay - only show when activated */}
      {isActivated && (
        <RectangleCursor
          width={rectangleCursorSize.width}
          height={rectangleCursorSize.height}
        />
      )}
    </div>
  );
};

export default ResiumGlobe;

// Re-export types for convenience
export type { ResiumGlobeProps, AreaSelection, CameraState } from './types';
