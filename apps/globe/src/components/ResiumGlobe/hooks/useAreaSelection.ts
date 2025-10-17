import { useCallback } from 'react';
import * as Cesium from 'cesium';
import { AreaSelection } from '../types';
import {
  calculateZoomLevel,
  calculateCenter,
  calculateRectangleArea,
  calculateRectangleDimensions,
  getRectangleCorners,
  screenToCartesian,
  calculateCameraHeight,
  isValidCartographic,
} from '../utils/calculations';

interface UseAreaSelectionProps {
  viewerRef: React.RefObject<{ cesiumElement?: Cesium.Viewer } | null>;
  rectangleWidth: number;
  rectangleHeight: number;
  onAreaSelected?: (areaData: AreaSelection) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to handle area selection when user presses the selection key
 * Calculates the ground area covered by the rectangle cursor
 */
export const useAreaSelection = ({
  viewerRef,
  rectangleWidth,
  rectangleHeight,
  onAreaSelected,
  onError,
}: UseAreaSelectionProps) => {
  const handleSelection = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) {
      console.warn('Viewer not available for selection');
      return;
    }

    try {
      const canvas = viewer.canvas;
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      // Get the four corners of the rectangle cursor in screen space
      const corners = getRectangleCorners(canvasWidth, canvasHeight, rectangleWidth, rectangleHeight);

      // Convert screen coordinates to cartographic coordinates
      const topLeftCartesian = screenToCartesian(viewer, corners.topLeft.x, corners.topLeft.y);
      const topRightCartesian = screenToCartesian(viewer, corners.topRight.x, corners.topRight.y);
      const bottomLeftCartesian = screenToCartesian(viewer, corners.bottomLeft.x, corners.bottomLeft.y);
      const bottomRightCartesian = screenToCartesian(viewer, corners.bottomRight.x, corners.bottomRight.y);

      // Convert to cartographic
      const topLeft = topLeftCartesian
        ? Cesium.Cartographic.fromCartesian(topLeftCartesian)
        : null;
      const topRight = topRightCartesian
        ? Cesium.Cartographic.fromCartesian(topRightCartesian)
        : null;
      const bottomLeft = bottomLeftCartesian
        ? Cesium.Cartographic.fromCartesian(bottomLeftCartesian)
        : null;
      const bottomRight = bottomRightCartesian
        ? Cesium.Cartographic.fromCartesian(bottomRightCartesian)
        : null;

      // Validate all corners
      const allCornersValid = [topLeft, topRight, bottomLeft, bottomRight].every(isValidCartographic);

      if (!allCornersValid) {
        const error = new Error(
          'Cannot select area: Rectangle extends beyond visible globe surface'
        );
        onError?.(error);
        return;
      }

      // Calculate bounds (in radians)
      const lons = [topLeft!.longitude, topRight!.longitude, bottomLeft!.longitude, bottomRight!.longitude];
      const lats = [topLeft!.latitude, topRight!.latitude, bottomLeft!.latitude, bottomRight!.latitude];

      const west = Math.min(...lons);
      const east = Math.max(...lons);
      const south = Math.min(...lats);
      const north = Math.max(...lats);

      // Calculate center
      const centerCartographic = calculateCenter(north, south, east, west);
      const centerCartesian = Cesium.Cartographic.toCartesian(centerCartographic);

      // Calculate camera height
      const cameraHeight = calculateCameraHeight(viewer);
      const zoomLevel = calculateZoomLevel(cameraHeight);

      // Calculate ground dimensions
      const { width, height } = calculateRectangleDimensions(
        topLeft,
        topRight,
        bottomLeft,
        bottomRight
      );

      // Calculate area
      const estimatedAreaKm2 = calculateRectangleArea(north, south, east, west);

      // Build the selection data
      const areaSelection: AreaSelection = {
        center: {
          cartesian: centerCartesian,
          cartographic: {
            longitude: Cesium.Math.toDegrees(centerCartographic.longitude),
            latitude: Cesium.Math.toDegrees(centerCartographic.latitude),
            height: centerCartographic.height,
          },
        },
        bounds: {
          north: Cesium.Math.toDegrees(north),
          south: Cesium.Math.toDegrees(south),
          east: Cesium.Math.toDegrees(east),
          west: Cesium.Math.toDegrees(west),
        },
        cameraHeight,
        zoomLevel,
        groundArea: {
          width,
          height,
          estimatedAreaKm2,
        },
        corners: {
          topLeft,
          topRight,
          bottomLeft,
          bottomRight,
        },
      };

      // Call the callback
      onAreaSelected?.(areaSelection);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Error selecting area:', err);
      onError?.(err);
    }
  }, [viewerRef, rectangleWidth, rectangleHeight, onAreaSelected, onError]);

  return { handleSelection };
};
