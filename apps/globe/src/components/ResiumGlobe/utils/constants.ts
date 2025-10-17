/**
 * Default configuration values for the ResiumGlobe component
 */

export const DEFAULT_CAMERA_POSITION = {
  longitude: 0,
  latitude: 0,
  height: 20000000, // 20,000 km
};

export const DEFAULT_RECTANGLE_CURSOR_SIZE = {
  width: 200,
  height: 150,
};

export const RECTANGLE_CURSOR_COLOR = 'rgba(255, 255, 100, 0.8)';
export const RECTANGLE_CURSOR_BORDER_WIDTH = 2;

// Keyboard controls
export const SELECTION_KEY = ' '; // Space bar
export const SELECTION_KEY_CODE = 'Space';

// Earth radius in meters (used for geodetic calculations)
export const EARTH_RADIUS_METERS = 6371000;

// Zoom level calculation constants
// Zoom level is estimated based on camera height
export const ZOOM_LEVEL_MAX_HEIGHT = 40000000; // meters (40,000 km)
export const ZOOM_LEVEL_MIN = 0;
export const ZOOM_LEVEL_MAX = 20;
