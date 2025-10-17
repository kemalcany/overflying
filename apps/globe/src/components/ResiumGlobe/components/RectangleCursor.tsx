/** @jsxImportSource @emotion/react */
'use client';

import React from 'react';
import { css } from '@emotion/react';
import {
  RECTANGLE_CURSOR_COLOR,
  RECTANGLE_CURSOR_BORDER_WIDTH,
  DEFAULT_RECTANGLE_CURSOR_SIZE,
} from '../utils/constants';

interface RectangleCursorProps {
  width?: number;
  height?: number;
}

const cursorContainerStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 999;
`;

const rectangleStyle = (width: number, height: number) => css`
  width: ${width}px;
  height: ${height}px;
  border: ${RECTANGLE_CURSOR_BORDER_WIDTH}px solid ${RECTANGLE_CURSOR_COLOR};
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(0, 0, 0, 0.2);
`;

const centerDotStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  background: ${RECTANGLE_CURSOR_COLOR};
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
`;

const hintStyle = css`
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  white-space: nowrap;
`;

/**
 * RectangleCursor component displays a fixed rectangle in the center of the viewport
 * This rectangle represents the area that will be selected when the user presses SPACE
 */
export const RectangleCursor: React.FC<RectangleCursorProps> = ({
  width = DEFAULT_RECTANGLE_CURSOR_SIZE.width,
  height = DEFAULT_RECTANGLE_CURSOR_SIZE.height,
}) => {
  return (
    <div css={cursorContainerStyle}>
      <div css={rectangleStyle(width, height)}>
        <div css={centerDotStyle} />
      </div>
      <div css={hintStyle}>Press SPACE to select area</div>
    </div>
  );
};
