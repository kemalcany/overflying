import { useEffect, useCallback } from 'react';
import * as Cesium from 'cesium';
import { CameraState } from '../types';

interface UseResiumViewerProps {
  viewerRef: React.RefObject<{ cesiumElement?: Cesium.Viewer } | null>;
  isActivated: boolean;
  onCameraChanged?: (cameraState: CameraState) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to manage the Resium viewer lifecycle
 * Handles initialization, resource management, and cleanup
 */
export const useResiumViewer = ({
  viewerRef,
  isActivated,
  onCameraChanged,
  onError,
}: UseResiumViewerProps) => {
  // Handle camera change events
  const handleCameraChange = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !onCameraChanged) return;

    try {
      const camera = viewer.camera;
      const position = camera.position.clone();
      const heading = camera.heading;
      const pitch = camera.pitch;
      const roll = camera.roll;
      const cartographic = camera.positionCartographic;
      const height = cartographic.height;

      const cameraState: CameraState = {
        position,
        heading,
        pitch,
        roll,
        height,
      };

      onCameraChanged(cameraState);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Error tracking camera:', err);
      onError?.(err);
    }
  }, [viewerRef, onCameraChanged, onError]);

  // Set up camera change listener
  useEffect(() => {
    if (!isActivated) return;

    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    // Listen for camera move end event
    const removeListener = viewer.camera.moveEnd.addEventListener(handleCameraChange);

    return () => {
      removeListener();
    };
  }, [viewerRef, isActivated, handleCameraChange]);

  // Handle resource management based on isActivated
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    if (!isActivated) {
      // Disable rendering to save resources
      viewer.useDefaultRenderLoop = false;
      console.log('Globe rendering paused');
    } else {
      // Re-enable rendering
      viewer.useDefaultRenderLoop = true;
      console.log('Globe rendering resumed');
    }
  }, [isActivated, viewerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const viewer = viewerRef.current?.cesiumElement;
      if (viewer && !viewer.isDestroyed()) {
        console.log('Cleaning up Cesium viewer resources');
      }
    };
  }, [viewerRef]);
};
