'use client';
import {useEffect, useRef, useState} from 'react';

declare global {
  interface Window {
    SplineApplication?: any;
    splineScriptLoading?: Promise<void>;
  }
}

export const SplineScene = ({scene}: {scene: string}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const splineRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const loadSpline = async () => {
      try {
        // Prevent double initialization early
        if (splineRef.current) {
          console.warn('Spline already initialized, skipping...');
          return;
        }

        // Load script if not already loaded or loading
        if (!window.SplineApplication) {
          if (!window.splineScriptLoading) {
            console.warn('Loading Spline script...');
            window.splineScriptLoading = new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.type = 'module';
              script.textContent = `
                import { Application } from 'https://unpkg.com/@splinetool/runtime@1.10.91/build/runtime.js';
                window.SplineApplication = Application;
              `;
              script.onload = () => setTimeout(resolve, 300);
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }

          await window.splineScriptLoading;
        }

        if (!mounted || !canvasRef.current || !window.SplineApplication) {
          return;
        }

        // Double check before initializing
        if (splineRef.current) {
          return;
        }

        // Initialize Spline
        console.warn('Initializing Spline application...');
        splineRef.current = new window.SplineApplication(canvasRef.current);
        await splineRef.current.load(scene);

        if (mounted) {
          console.warn('Spline scene loaded successfully');
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load Spline:', err);
        if (mounted) {
          setError('Failed to load 3D scene');
        }
      }
    };

    loadSpline();

    return () => {
      mounted = false;
      if (splineRef.current) {
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
