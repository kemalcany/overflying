'use client'
import dynamic from 'next/dynamic'

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <div style={{ height: '400px', background: '#000000' }}>Loading 3D scene...</div>,
})

export const SplineScene = ({ scene }: { scene: string }) => {
  return <Spline scene={scene} />
}
