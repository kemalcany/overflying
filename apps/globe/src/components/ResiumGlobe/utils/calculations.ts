import * as Cesium from 'cesium';
import { ZOOM_LEVEL_MAX_HEIGHT, ZOOM_LEVEL_MIN, ZOOM_LEVEL_MAX, EARTH_RADIUS_METERS } from './constants';

/**
 * Calculate zoom level based on camera height
 * Returns a value between ZOOM_LEVEL_MIN and ZOOM_LEVEL_MAX
 */
export function calculateZoomLevel(cameraHeight: number): number {
  const normalizedHeight = Math.min(cameraHeight / ZOOM_LEVEL_MAX_HEIGHT, 1);
  return ZOOM_LEVEL_MAX - (normalizedHeight * (ZOOM_LEVEL_MAX - ZOOM_LEVEL_MIN));
}

/**
 * Calculate geodetic distance between two cartographic points in meters
 * Uses the haversine formula for better accuracy
 */
export function calculateDistance(
  point1: Cesium.Cartographic,
  point2: Cesium.Cartographic
): number {
  const lat1 = point1.latitude;
  const lon1 = point1.longitude;
  const lat2 = point2.latitude;
  const lon2 = point2.longitude;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate the area of a rectangle on the Earth's surface in square kilometers
 */
export function calculateRectangleArea(
  north: number,
  south: number,
  east: number,
  west: number
): number {
  // Convert to radians if in degrees
  const northRad = north;
  const southRad = south;
  const eastRad = east;
  const westRad = west;

  // Use Cesium's built-in ellipsoid for more accurate calculations
  const ellipsoid = Cesium.Ellipsoid.WGS84;

  const rectangle = Cesium.Rectangle.fromRadians(westRad, southRad, eastRad, northRad);

  // Use Cesium's surface area calculation (more accurate for large areas)
  const areaMeters = ellipsoid.surfaceArea(rectangle);

  // Convert to km²
  return areaMeters / 1_000_000;
}

/**
 * Calculate center point of a rectangle
 */
export function calculateCenter(
  north: number,
  south: number,
  east: number,
  west: number
): Cesium.Cartographic {
  const centerLon = (east + west) / 2;
  const centerLat = (north + south) / 2;

  return Cesium.Cartographic.fromRadians(centerLon, centerLat, 0);
}

/**
 * Convert screen coordinates to cartesian position on globe
 * Returns null if the point doesn't intersect the globe
 */
export function screenToCartesian(
  viewer: Cesium.Viewer,
  screenX: number,
  screenY: number
): Cesium.Cartesian3 | null {
  const cartesian = viewer.camera.pickEllipsoid(
    new Cesium.Cartesian2(screenX, screenY),
    viewer.scene.globe.ellipsoid
  );

  return cartesian || null;
}

/**
 * Calculate the dimensions (width and height) of a rectangle on the ground
 */
export function calculateRectangleDimensions(
  topLeft: Cesium.Cartographic | null,
  topRight: Cesium.Cartographic | null,
  bottomLeft: Cesium.Cartographic | null,
  bottomRight: Cesium.Cartographic | null
): { width: number; height: number } {
  // If any corner is missing, return zero dimensions
  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    return { width: 0, height: 0 };
  }

  // Calculate width (average of top and bottom edges)
  const topWidth = calculateDistance(topLeft, topRight);
  const bottomWidth = calculateDistance(bottomLeft, bottomRight);
  const width = (topWidth + bottomWidth) / 2;

  // Calculate height (average of left and right edges)
  const leftHeight = calculateDistance(topLeft, bottomLeft);
  const rightHeight = calculateDistance(topRight, bottomRight);
  const height = (leftHeight + rightHeight) / 2;

  return { width, height };
}

/**
 * Handle edge cases and validate cartographic coordinates
 */
export function isValidCartographic(cartographic: Cesium.Cartographic | null): boolean {
  if (!cartographic) return false;

  // Check for NaN values
  if (isNaN(cartographic.longitude) || isNaN(cartographic.latitude)) {
    return false;
  }

  // Check for reasonable bounds (in radians)
  if (
    Math.abs(cartographic.longitude) > Math.PI ||
    Math.abs(cartographic.latitude) > Math.PI / 2
  ) {
    return false;
  }

  return true;
}

/**
 * Calculate camera height above the ground at the center of the view
 */
export function calculateCameraHeight(viewer: Cesium.Viewer): number {
  const cameraPosition = viewer.camera.positionCartographic;
  return cameraPosition.height;
}

/**
 * Get the four corners of the rectangle cursor in screen space
 * Returns screen coordinates for each corner
 */
export function getRectangleCorners(
  canvasWidth: number,
  canvasHeight: number,
  rectWidth: number,
  rectHeight: number
): {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
} {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const halfWidth = rectWidth / 2;
  const halfHeight = rectHeight / 2;

  return {
    topLeft: { x: centerX - halfWidth, y: centerY - halfHeight },
    topRight: { x: centerX + halfWidth, y: centerY - halfHeight },
    bottomLeft: { x: centerX - halfWidth, y: centerY + halfHeight },
    bottomRight: { x: centerX + halfWidth, y: centerY + halfHeight },
  };
}
