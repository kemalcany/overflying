'use client';
import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
});

export const SplineScene = ({scene}: {scene: string}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div style={{height: '400px', background: '#000000'}}>
        Loading 3D scene...
      </div>
    );
  }

  return <Spline scene={scene} />;
};
