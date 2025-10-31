'use client';
import {useEffect, useRef, useState} from 'react';

declare global {
  interface Window {
    SplineApplication?: any;
  }
}

// Load Spline script once globally
const loadSplineScript = (() => {
  let loadPromise: Promise<void> | null = null;

  return () => {
    if (window.SplineApplication) {
      return Promise.resolve();
    }

    if (!loadPromise) {
      // console.log('Loading Spline script globally');
      loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = `
          import { Application } from 'https://unpkg.com/@splinetool/runtime@1.10.91/build/runtime.js';
          window.SplineApplication = Application;
          window.dispatchEvent(new Event('spline-loaded'));
        `;

        const onLoad = () => {
          // console.log('Spline script loaded globally');
          window.removeEventListener('spline-loaded', onLoad);
          resolve();
        };

        window.addEventListener('spline-loaded', onLoad);
        script.onerror = () => {
          window.removeEventListener('spline-loaded', onLoad);
          reject(new Error('Failed to load Spline script'));
        };

        document.head.appendChild(script);
      });
    }

    return loadPromise;
  };
})();

export const SplineScene = ({scene}: {scene: string}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const splineRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const initializeSpline = async () => {
      try {
        // Load Spline script if not already loaded
        await loadSplineScript();

        if (!mounted || !canvasRef.current) {
          return;
        }

        // Clean up previous instance if scene changes
        if (splineRef.current) {
          splineRef.current.dispose?.();
          splineRef.current = null;
        }

        // Initialize new Spline instance with the scene
        // console.log(`Initializing Spline with scene: ${scene}`);
        const app = new window.SplineApplication(canvasRef.current);
        splineRef.current = app;

        await app.load(scene);

        if (mounted) {
          // console.log('Spline scene loaded successfully');
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load Spline:', err);
        if (mounted) {
          setError('Failed to load 3D scene');
        }
      }
    };

    initializeSpline();

    return () => {
      mounted = false;
      if (splineRef.current) {
        splineRef.current.dispose?.();
        splineRef.current = null;
      }
    };
  }, [scene]);

  if (error) {
    return (
      <div
        style={{
          height: '400px',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{position: 'relative', height: '400px', background: '#000000'}}>
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
          }}
        >
          Loading 3D scene...
        </div>
      )}
      <canvas ref={canvasRef} style={{width: '100%', height: '100%'}} />
    </div>
  );
};
