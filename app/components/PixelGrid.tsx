import React from 'react';
import styles from './PixelGrid.module.css';

interface PixelGridProps {
  colors: [number, number, number][];
  pixelDimensions: {
    width: number;
    height: number;
  };
  horizontalPixelSize: number;
  verticalPixelSize: number;
}

export default function PixelGrid({ 
  colors, 
  pixelDimensions, 
  horizontalPixelSize, 
  verticalPixelSize 
}: PixelGridProps) {
  const getComplementaryColor = (r: number, g: number, b: number): string => {
    const complementaryR = 255 - r;
    const complementaryG = 255 - g;
    const complementaryB = 255 - b;
    return `rgba(${complementaryR}, ${complementaryG}, ${complementaryB}, 0.5)`;
  };

  const handlePixelClick = (x: number, y: number) => {
    const pixelIndex = y * pixelDimensions.width + x;
    const color = colors[pixelIndex];
    if (color) {
      const [r, g, b] = color;
      const borderColor = getComplementaryColor(r, g, b);
      const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
      if (pixel) {
        pixel.setAttribute('style', `
          background-color: rgb(${r}, ${g}, ${b}); 
          border: 1px solid ${borderColor};
        `);
      }
    }
  };

  const renderPixel = (x: number, y: number) => {
    const pixelIndex = y * pixelDimensions.width + x;
    const color = colors[pixelIndex];
    const [r, g, b] = color || [255, 255, 255];
    const borderColor = getComplementaryColor(r, g, b);

    return (
      <div
        key={`${x}-${y}`}
        data-x={x}
        data-y={y}
        className={styles.pixel}
        style={{
          backgroundColor: `rgb(${r}, ${g}, ${b})`,
          border: `1px solid ${borderColor}`,
          width: `${horizontalPixelSize}px`,
          height: `${verticalPixelSize}px`,
        }}
        onClick={() => handlePixelClick(x, y)}
      />
    );
  };

  return (
    <div className={styles.pixelGrid}>
      {Array.from({ length: pixelDimensions.height }, (_, y) => (
        <div key={y} className={styles.row}>
          {Array.from({ length: pixelDimensions.width }, (_, x) => renderPixel(x, y))}
        </div>
      ))}
    </div>
  );
} 