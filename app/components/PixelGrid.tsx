import React, { useState, useCallback } from 'react';
import styles from './PixelGrid.module.css';
import { getComplementaryColorString } from '@/lib/colorUtils';

interface PixelGridProps {
  colors: [number, number, number][];
  pixelDimensions: {
    width: number;
    height: number;
  };
  horizontalPixelSize: number;
  verticalPixelSize: number;
  onPixelClick?: (x: number, y: number, color: [number, number, number]) => void;
}

interface PixelState {
  color: [number, number, number];
  isHighlighted: boolean;
}

export default function PixelGrid({
  colors,
  pixelDimensions,
  horizontalPixelSize,
  verticalPixelSize,
  onPixelClick,
}: PixelGridProps) {
  // 각 픽셀의 상태를 React state로 관리 (DOM 직접 조작 대신)
  const [pixelStates, setPixelStates] = useState<Map<string, PixelState>>(new Map());

  /**
   * 픽셀 키 생성
   */
  const getPixelKey = (x: number, y: number): string => `${x}-${y}`;

  /**
   * 픽셀 클릭 핸들러 - React state를 통해 업데이트
   */
  const handlePixelClick = useCallback(
    (x: number, y: number) => {
      const pixelIndex = y * pixelDimensions.width + x;
      const color = colors[pixelIndex];

      if (color) {
        // 외부 핸들러 호출
        onPixelClick?.(x, y, color);

        // React state 업데이트 (DOM 직접 조작 대신)
        setPixelStates((prev) => {
          const newStates = new Map(prev);
          const key = getPixelKey(x, y);
          const currentState = newStates.get(key);

          newStates.set(key, {
            color,
            isHighlighted: !currentState?.isHighlighted,
          });

          return newStates;
        });
      }
    },
    [colors, pixelDimensions.width, onPixelClick]
  );

  /**
   * 단일 픽셀 렌더링
   */
  const renderPixel = (x: number, y: number) => {
    const pixelIndex = y * pixelDimensions.width + x;
    const color = colors[pixelIndex];
    const [r, g, b] = color || [255, 255, 255];
    const borderColor = getComplementaryColorString(r, g, b, 0.5);

    // 픽셀 상태 확인
    const key = getPixelKey(x, y);
    const pixelState = pixelStates.get(key);
    const isHighlighted = pixelState?.isHighlighted || false;

    return (
      <div
        key={key}
        className={`${styles.pixel} ${isHighlighted ? styles.highlighted : ''}`}
        style={{
          backgroundColor: `rgb(${r}, ${g}, ${b})`,
          border: `1px solid ${borderColor}`,
          width: `${horizontalPixelSize}px`,
          height: `${verticalPixelSize}px`,
        }}
        onClick={() => handlePixelClick(x, y)}
        role="button"
        tabIndex={0}
        aria-label={`픽셀 (${x}, ${y}) - RGB(${r}, ${g}, ${b})`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handlePixelClick(x, y);
          }
        }}
      />
    );
  };

  return (
    <div
      className={styles.pixelGrid}
      role="grid"
      aria-label={`${pixelDimensions.width}x${pixelDimensions.height} 픽셀 그리드`}
    >
      {Array.from({ length: pixelDimensions.height }, (_, y) => (
        <div key={y} className={styles.row} role="row">
          {Array.from({ length: pixelDimensions.width }, (_, x) => renderPixel(x, y))}
        </div>
      ))}
    </div>
  );
}
