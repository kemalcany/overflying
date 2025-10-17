import * as Cesium from 'cesium';

/**
 * Main props interface for the ResiumGlobe component
 */
export interface ResiumGlobeProps {
  // Required
  cesiumAccessToken: string; // From ENV

  // Control flags
  isActivated: boolean; // Controls whether Cesium is running

  // Optional configuration
  defaultCameraPosition?: {
    longitude: number;
    latitude: number;
    height: number;
  };

  // Rectangle cursor configuration
  rectangleCursorSize?: {
    width: number; // pixels
    height: number; // pixels
  };

  // Event callbacks
  onAreaSelected?: (areaData: AreaSelection) => void;
  onCameraChanged?: (cameraState: CameraState) => void;
  onError?: (error: Error) => void;
}

/**
 * Data structure returned when an area is selected via SPACE key
 */
export interface AreaSelection {
  // Center point coordinates
  center: {
    cartesian: Cesium.Cartesian3;
    cartographic: {
      longitude: number; // degrees
      latitude: number; // degrees
      height: number; // meters
    };
  };

  // Rectangle bounds
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  // Camera information
  cameraHeight: number; // Distance from globe in meters
  zoomLevel: number; // Calculated zoom level

  // Ground area coverage
  groundArea: {
    width: number; // meters
    height: number; // meters
    estimatedAreaKm2: number;
  };

  // Corner positions for debugging/advanced use
  corners: {
    topLeft: Cesium.Cartographic | null;
    topRight: Cesium.Cartographic | null;
    bottomLeft: Cesium.Cartographic | null;
    bottomRight: Cesium.Cartographic | null;
  };
}

/**
 * Camera state information
 */
export interface CameraState {
  position: Cesium.Cartesian3;
  heading: number;
  pitch: number;
  roll: number;
  height: number;
}

/**
 * Internal ref type for Resium Viewer component
 */
export type CesiumViewerRef = {
  cesiumElement?: Cesium.Viewer;
};
