/** @jsxImportSource @emotion/react */
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { css } from '@emotion/react'

// Dynamically import the ResiumGlobe component with no SSR
const ResiumGlobe = dynamic(() => import('@/components/ResiumGlobe'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#333',
      }}
    >
      Loading Globe...
    </div>
  ),
})

// Import types (these are fine for SSR)
import type { AreaSelection, CameraState } from '@/components/ResiumGlobe'

// Styles
const containerStyle = css`
  width: 100vw;
  height: 100vh;
  position: relative;
`

const controlPanelStyle = css`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 350px;
  z-index: 1000;
  max-height: 90vh;
  overflow-y: auto;
`

const titleStyle = css`
  margin: 0 0 15px 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
`

const sectionTitleStyle = css`
  margin: 15px 0 8px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #555;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 4px;
`

const textStyle = css`
  margin: 5px 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
`

const buttonStyle = css`
  margin-top: 12px;
  padding: 10px 18px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background: #3a8eef;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`

const dataBoxStyle = css`
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-top: 10px;
  font-size: 0.85rem;
  color: #555;
`

const labelStyle = css`
  font-weight: 600;
  color: #333;
  margin-right: 4px;
`

const errorStyle = css`
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
  padding: 10px;
  border-radius: 6px;
  margin-top: 10px;
  font-size: 0.85rem;
`

const hintStyle = css`
  background: #e7f3ff;
  border-left: 3px solid #4a9eff;
  padding: 10px;
  margin-top: 12px;
  font-size: 0.85rem;
  color: #004085;
  border-radius: 4px;
`

// Cesium access token from environment or hardcoded
const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN!

export default function Home() {
  const [isGlobeActive, setIsGlobeActive] = useState(true)
  const [selectedArea, setSelectedArea] = useState<AreaSelection | null>(null)
  const [cameraState, setCameraState] = useState<CameraState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAreaSelected = (areaData: AreaSelection) => {
    setSelectedArea(areaData)
    setError(null) // Clear any previous errors
    console.log('Area selected:', areaData)
  }

  const handleCameraChanged = (state: CameraState) => {
    setCameraState(state)
  }

  const handleError = (err: Error) => {
    setError(err.message)
    console.error('Globe error:', err)
  }

  const clearSelection = () => {
    setSelectedArea(null)
  }

  return (
    <div css={containerStyle}>
      <ResiumGlobe cesiumAccessToken={CESIUM_TOKEN} isActivated={isGlobeActive} onAreaSelected={handleAreaSelected} onCameraChanged={handleCameraChanged} onError={handleError} />

      <div css={controlPanelStyle}>
        <h2 css={titleStyle}>ResiumGlobe Demo</h2>

        <div css={textStyle}>
          <strong>Controls:</strong>
        </div>
        <ul
          css={css`
            margin: 8px 0;
            padding-left: 20px;
            font-size: 0.85rem;
            color: #666;
          `}
        >
          <li>Drag to rotate globe</li>
          <li>Scroll to zoom in/out</li>
          <li>Right-drag to pan</li>
          <li>
            <strong>SPACE</strong> to select area
          </li>
        </ul>

        <button css={buttonStyle} onClick={() => setIsGlobeActive(!isGlobeActive)}>
          {isGlobeActive ? '⏸ Pause' : '▶ Resume'} Globe
        </button>

        {error && (
          <div css={errorStyle}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {selectedArea && (
          <>
            <h3 css={sectionTitleStyle}>Selected Area</h3>

            <div css={dataBoxStyle}>
              <div css={textStyle}>
                <span css={labelStyle}>Center:</span>
                {selectedArea.center.cartographic.latitude.toFixed(4)}°, {selectedArea.center.cartographic.longitude.toFixed(4)}°
              </div>

              <div css={textStyle}>
                <span css={labelStyle}>Area:</span>
                {selectedArea.groundArea.estimatedAreaKm2.toFixed(2)} km²
              </div>

              <div css={textStyle}>
                <span css={labelStyle}>Dimensions:</span>
                {(selectedArea.groundArea.width / 1000).toFixed(2)} × {(selectedArea.groundArea.height / 1000).toFixed(2)} km
              </div>

              <div css={textStyle}>
                <span css={labelStyle}>Zoom Level:</span>
                {selectedArea.zoomLevel.toFixed(1)}
              </div>
            </div>

            <div css={dataBoxStyle}>
              <div
                css={css`
                  ${textStyle};
                  font-weight: 600;
                  margin-bottom: 4px;
                `}
              >
                Bounds:
              </div>
              <div css={textStyle}>North: {selectedArea.bounds.north.toFixed(4)}°</div>
              <div css={textStyle}>South: {selectedArea.bounds.south.toFixed(4)}°</div>
              <div css={textStyle}>East: {selectedArea.bounds.east.toFixed(4)}°</div>
              <div css={textStyle}>West: {selectedArea.bounds.west.toFixed(4)}°</div>
            </div>

            <button css={buttonStyle} onClick={clearSelection}>
              Clear Selection
            </button>
          </>
        )}

        {cameraState && (
          <>
            <h3 css={sectionTitleStyle}>Camera Info</h3>
            <div css={dataBoxStyle}>
              <div css={textStyle}>
                <span css={labelStyle}>Height:</span>
                {(cameraState.height / 1000).toFixed(2)} km
              </div>
              <div css={textStyle}>
                <span css={labelStyle}>Heading:</span>
                {((cameraState.heading * 180) / Math.PI).toFixed(1)}°
              </div>
              <div css={textStyle}>
                <span css={labelStyle}>Pitch:</span>
                {((cameraState.pitch * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>
          </>
        )}

        {!selectedArea && (
          <div css={hintStyle}>
            💡 <strong>Tip:</strong> Position the yellow rectangle over any area on the globe and press <strong>SPACE</strong> to select it and see detailed information!
          </div>
        )}

        <div
          css={css`
            ${textStyle};
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
          `}
        >
          <strong>Built with:</strong>
          <ul
            css={css`
              margin: 5px 0;
              padding-left: 20px;
              font-size: 0.85rem;
            `}
          >
            <li>Cesium (3D globe)</li>
            <li>Resium (React bindings)</li>
            <li>Emotion CSS (styling)</li>
            <li>Next.js (framework)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
