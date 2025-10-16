'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Globe component with no SSR
const Globe = dynamic(() => import('@/components/Globe'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.5rem',
      color: '#333'
    }}>
      Loading Globe...
    </div>
  ),
});

export default function Home() {
  return <Globe />;
}
