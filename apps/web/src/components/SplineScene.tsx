'use client';
import {useEffect, useRef, useState} from 'react';

declare global {
  interface Window {
    SplineApplication?: any;
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
        // Load script if not already loaded
        if (!window.SplineApplication) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.textContent = `
              import { Application } from 'https://unpkg.com/@splinetool/runtime@1.10.29/build/runtime.js';
              window.SplineApplication = Application;
            `;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // Wait a bit for the module to be available
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!mounted || !canvasRef.current || !window.SplineApplication) {
          return;
        }

        // Initialize Spline
        splineRef.current = new window.SplineApplication(canvasRef.current);
        await splineRef.current.load(scene);

        if (mounted) {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Spline error:', err);
        if (mounted) {
          setError('Failed to load 3D scene');
        }
      }
    };

    loadSpline();

    return () => {
      mounted = false;
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
