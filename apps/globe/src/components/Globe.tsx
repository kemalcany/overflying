/** @jsxImportSource @emotion/react */
'use client'

import { useRef, useState } from 'react'
import { css } from '@emotion/react'
import { Viewer, Entity, ScreenSpaceEventHandler, ScreenSpaceEvent, RectangleGraphics } from 'resium'
import { Cartographic, Color, Math as CesiumMath, Rectangle as CesiumRectangle, ScreenSpaceEventType, Ion } from 'cesium'

// Set Cesium Ion token
Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZDlmM2QzYi1iZGM0LTQyYzUtYmM5Mi1jOGExODYyNjFiNWYiLCJpZCI6MTYwOTA3LCJpYXQiOjE3NjA1NTU0MDB9.cZCFe_bPoe9IG-4f_GYofoXu09ZQJAmmdPTUvqlVJUg'

const containerStyle = css`
  width: 100vw;
  height: 100vh;
  position: relative;
`

const infoBoxStyle = css`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 300px;
  z-index: 1000;
`

const titleStyle = css`
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
`

const textStyle = css`
  margin: 5px 0;
  font-size: 0.9rem;
  color: #666;
`

const buttonStyle = css`
  margin-top: 10px;
  padding: 8px 16px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;

  &:hover {
    background: #3a8eef;
  }
`

interface SelectedArea {
  west: number
  east: number
  south: number
  north: number
}

export default function Globe() {
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null)
  const [rectangleCoords, setRectangleCoords] = useState<CesiumRectangle | null>(null)
  const startPositionRef = useRef<Cartographic | null>(null)
  const viewerRef = useRef<any>(null)

  const handleMouseDown = (movement: any) => {
    if (!viewerRef.current?.cesiumElement) return

    const viewer = viewerRef.current.cesiumElement
    const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid)

    if (cartesian) {
      const cartographic = Cartographic.fromCartesian(cartesian)
      startPositionRef.current = cartographic
      setRectangleCoords(null)
    }
  }

  const handleMouseMove = (movement: any) => {
    if (!startPositionRef.current || !viewerRef.current?.cesiumElement) return

    const viewer = viewerRef.current.cesiumElement
    const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid)

    if (cartesian) {
      const endCartographic = Cartographic.fromCartesian(cartesian)

      const west = Math.min(startPositionRef.current.longitude, endCartographic.longitude)
      const east = Math.max(startPositionRef.current.longitude, endCartographic.longitude)
      const south = Math.min(startPositionRef.current.latitude, endCartographic.latitude)
      const north = Math.max(startPositionRef.current.latitude, endCartographic.latitude)

      setRectangleCoords(CesiumRectangle.fromRadians(west, south, east, north))
    }
  }

  const handleMouseUp = (movement: any) => {
    if (!startPositionRef.current || !viewerRef.current?.cesiumElement) return

    const viewer = viewerRef.current.cesiumElement
    const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid)

    if (cartesian) {
      const endCartographic = Cartographic.fromCartesian(cartesian)

      const west = Math.min(startPositionRef.current.longitude, endCartographic.longitude)
      const east = Math.max(startPositionRef.current.longitude, endCartographic.longitude)
      const south = Math.min(startPositionRef.current.latitude, endCartographic.latitude)
      const north = Math.max(startPositionRef.current.latitude, endCartographic.latitude)

      setSelectedArea({
        west: CesiumMath.toDegrees(west),
        east: CesiumMath.toDegrees(east),
        south: CesiumMath.toDegrees(south),
        north: CesiumMath.toDegrees(north),
      })
    }

    startPositionRef.current = null
  }

  const handleClearSelection = () => {
    setSelectedArea(null)
    setRectangleCoords(null)
  }

  return (
    <div css={containerStyle}>
      <Viewer ref={viewerRef} full timeline={false} animation={false} baseLayerPicker={false}>
        <ScreenSpaceEventHandler>
          <ScreenSpaceEvent action={handleMouseDown} type={ScreenSpaceEventType.LEFT_DOWN} />
          <ScreenSpaceEvent action={handleMouseMove} type={ScreenSpaceEventType.MOUSE_MOVE} />
          <ScreenSpaceEvent action={handleMouseUp} type={ScreenSpaceEventType.LEFT_UP} />
        </ScreenSpaceEventHandler>

        {rectangleCoords && (
          <Entity>
            <RectangleGraphics
              coordinates={rectangleCoords}
              material={Color.fromCssColorString('#4a9eff').withAlpha(0.3)}
              outline
              outlineColor={Color.fromCssColorString('#4a9eff')}
              outlineWidth={2}
            />
          </Entity>
        )}
      </Viewer>

      <div css={infoBoxStyle}>
        <h2 css={titleStyle}>Interactive Globe</h2>
        <p css={textStyle}>
          <strong>Drag</strong> on the globe to select an area
        </p>

        {selectedArea ? (
          <>
            <div css={textStyle}>
              <strong>Selected Area:</strong>
            </div>
            <div css={textStyle}>West: {selectedArea.west.toFixed(4)}°</div>
            <div css={textStyle}>East: {selectedArea.east.toFixed(4)}°</div>
            <div css={textStyle}>South: {selectedArea.south.toFixed(4)}°</div>
            <div css={textStyle}>North: {selectedArea.north.toFixed(4)}°</div>
            <button css={buttonStyle} onClick={handleClearSelection}>
              Clear Selection
            </button>
          </>
        ) : (
          <div css={textStyle}>
            <em>No area selected</em>
          </div>
        )}

        <div
          css={css`
            ${textStyle};
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
          `}
        >
          <strong>Technologies:</strong>
          <ul
            css={css`
              margin: 5px 0;
              padding-left: 20px;
              font-size: 0.85rem;
            `}
          >
            <li>3D globe – Cesium</li>
            <li>React binding – Resium</li>
            <li>Styling – Emotion CSS</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
