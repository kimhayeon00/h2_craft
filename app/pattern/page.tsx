'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './pattern.module.css';
import { useRouter } from 'next/navigation';
import GaugeInput from '../components/GaugeInput';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import {
  Color,
  ColorWithCount,
  extractDominantColors,
  getWeightedAverageColor,
  findClosestColor,
  colorKey,
} from '@/lib/colorUtils';

export default function PatternPage() {
  const { isAndroid, isIOS, isMobile } = useDeviceDetect();

  const [image, setImage] = useState<string | null>(null);
  const [pixelatedImageData, setPixelatedImageData] = useState<string | null>(null);
  const [originalPixelatedData, setOriginalPixelatedData] = useState<string | null>(null);

  const [pixelSize, setPixelSize] = useState(20);
  const [colorCount, setColorCount] = useState(2);
  const [gauge, setGauge] = useState<{ horizontal: number; vertical: number } | null>(null);

  const [dominantColors, setDominantColors] = useState<ColorWithCount[]>([]);
  const [pixelDimensions, setPixelDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 픽셀 크기 정보 저장 (격자 다시 그릴 때 필요)
  const pixelSizeInfoRef = useRef<{ width: number; height: number; hSize: number; vSize: number } | null>(null);
  // 색상만 저장하는 별도 캔버스 (격자 없이)
  const colorOnlyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  /**
   * 캔버스에 격자선 그리기 (색상 위에 직접)
   */
  const drawGridOnCanvas = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, hPixelSize: number, vPixelSize: number) => {
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x <= width; x += hPixelSize) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (let y = 0; y <= height; y += vPixelSize) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();
  }, []);

  /**
   * 현재 색상 캔버스 위에 격자를 합성해서 표시 캔버스에 그리기
   */
  const compositeWithGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const colorCanvas = colorOnlyCanvasRef.current;
    const info = pixelSizeInfoRef.current;
    if (!canvas || !colorCanvas || !info) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // 색상 데이터 복사
    ctx.drawImage(colorCanvas, 0, 0);
    // 격자 그리기
    drawGridOnCanvas(ctx, info.width, info.height, info.hSize, info.vSize);
  }, [drawGridOnCanvas]);

  /**
   * 이미지 픽셀화 처리
   */
  const pixelateImage = useCallback((img: HTMLImageElement, pixelSize: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: false,
    });
    if (!ctx) return;

    setIsProcessing(true);

    try {
      const maxWidth = 1200;
      const maxHeight = 1200;
      const aspectRatio = img.width / img.height;

      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      const basePixelSize = pixelSize;
      const ratio = gauge ? gauge.horizontal / gauge.vertical : 1;
      const horizontalPixelSize = basePixelSize;
      const verticalPixelSize = Math.round(basePixelSize * ratio);

      width = Math.floor(width / horizontalPixelSize) * horizontalPixelSize;
      height = Math.floor(height / verticalPixelSize) * verticalPixelSize;

      const pixelWidth = Math.floor(width / horizontalPixelSize);
      const pixelHeight = Math.floor(height / verticalPixelSize);
      setPixelDimensions({ width: pixelWidth, height: pixelHeight });

      // 픽셀 크기 정보 저장
      pixelSizeInfoRef.current = { width, height, hSize: horizontalPixelSize, vSize: verticalPixelSize };

      // 캔버스 크기 설정 (DPR 없이 논리적 크기)
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = '';
      canvas.style.height = '';

      // 색상 전용 캔버스 생성
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = width;
      colorCanvas.height = height;
      colorOnlyCanvasRef.current = colorCanvas;
      const colorCtx = colorCanvas.getContext('2d', { alpha: false });
      if (!colorCtx) return;

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { alpha: false });
      if (!tempCtx) return;

      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      tempCtx.drawImage(img, 0, 0, width, height);

      const imageData = tempCtx.getImageData(0, 0, width, height);
      const dominantColorsList = extractDominantColors(imageData, colorCount);

      const colorCounts: { [key: string]: number } = {};

      for (let y = 0; y < height; y += verticalPixelSize) {
        for (let x = 0; x < width; x += horizontalPixelSize) {
          const blockColors: Color[] = [];

          for (let py = y; py < Math.min(y + verticalPixelSize, height); py++) {
            for (let px = x; px < Math.min(x + horizontalPixelSize, width); px++) {
              const i = (py * width + px) * 4;
              blockColors.push({
                r: imageData.data[i],
                g: imageData.data[i + 1],
                b: imageData.data[i + 2],
              });
            }
          }

          const blockColor = getWeightedAverageColor(blockColors);
          const closestColor = findClosestColor(blockColor, dominantColorsList);

          // 색상 전용 캔버스에 그리기
          colorCtx.fillStyle = `rgb(${closestColor.r}, ${closestColor.g}, ${closestColor.b})`;
          colorCtx.fillRect(x, y, horizontalPixelSize, verticalPixelSize);

          const key = colorKey(closestColor);
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
      }

      // 표시 캔버스 = 색상 + 격자
      ctx.drawImage(colorCanvas, 0, 0);
      drawGridOnCanvas(ctx, width, height, horizontalPixelSize, verticalPixelSize);

      const colorsWithPercentage: ColorWithCount[] = Object.entries(colorCounts)
        .map(([key, count]) => {
          const [r, g, b] = key.split(',').map(Number);
          const totalBlocks = pixelWidth * pixelHeight;
          const percentage = (count / totalBlocks) * 100;
          return { r, g, b, count, percentage };
        })
        .sort((a, b) => b.percentage - a.percentage);

      setDominantColors(colorsWithPercentage);

      // 미리보기용: 격자 포함된 이미지
      const withGridData = canvas.toDataURL();
      setPixelatedImageData(withGridData);
      setOriginalPixelatedData(withGridData);
    } finally {
      setIsProcessing(false);
    }
  }, [colorCount, gauge, drawGridOnCanvas]);

  const handleGaugeSubmit = (horizontalGauge: number, verticalGauge: number) => {
    setGauge({ horizontal: horizontalGauge, vertical: verticalGauge });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (image) {
      const img = document.createElement('img');
      img.onload = () => {
        pixelateImage(img, pixelSize);
      };
      img.src = image;
    }
  }, [image, pixelSize, colorCount, pixelateImage]);

  const getCanvasPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const basePixelSize = pixelSize;
    const ratio = gauge ? gauge.horizontal / gauge.vertical : 1;
    const horizontalPixelSize = basePixelSize;
    const verticalPixelSize = Math.round(basePixelSize * ratio);

    const blockX = Math.floor(canvasX / horizontalPixelSize) * horizontalPixelSize;
    const blockY = Math.floor(canvasY / verticalPixelSize) * verticalPixelSize;

    return { blockX, blockY, horizontalPixelSize, verticalPixelSize };
  };

  /**
   * 픽셀 블록 그리기: 색상 캔버스에 칠하고 → 표시 캔버스에 색상+격자 합성
   */
  const drawPixelBlock = (blockX: number, blockY: number, hSize: number, vSize: number) => {
    if (!selectedColor || !canvasRef.current) return;
    const colorCanvas = colorOnlyCanvasRef.current;
    if (!colorCanvas) return;

    // 1. 색상 전용 캔버스에 칠하기
    const colorCtx = colorCanvas.getContext('2d', { alpha: false });
    if (!colorCtx) return;
    colorCtx.fillStyle = `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`;
    colorCtx.fillRect(blockX, blockY, hSize, vSize);

    // 2. 표시 캔버스: 해당 영역만 색상 복사 + 격자 다시 그리기
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // 해당 블록 색상 칠하기
    ctx.fillStyle = `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`;
    ctx.fillRect(blockX, blockY, hSize, vSize);

    // 해당 블록 주변 격자선 다시 그리기
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // 좌, 우 세로선
    ctx.moveTo(blockX + 0.5, blockY);
    ctx.lineTo(blockX + 0.5, blockY + vSize);
    ctx.moveTo(blockX + hSize + 0.5, blockY);
    ctx.lineTo(blockX + hSize + 0.5, blockY + vSize);
    // 상, 하 가로선
    ctx.moveTo(blockX, blockY + 0.5);
    ctx.lineTo(blockX + hSize, blockY + 0.5);
    ctx.moveTo(blockX, blockY + vSize + 0.5);
    ctx.lineTo(blockX + hSize, blockY + vSize + 0.5);
    ctx.stroke();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getCanvasPixelCoords(e);
    if (coords) {
      drawPixelBlock(coords.blockX, coords.blockY, coords.horizontalPixelSize, coords.verticalPixelSize);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasPixelCoords(e);
    if (coords) {
      drawPixelBlock(coords.blockX, coords.blockY, coords.horizontalPixelSize, coords.verticalPixelSize);
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const touch = e.touches[0];
    const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<HTMLCanvasElement>;
    const coords = getCanvasPixelCoords(mouseEvent);
    if (coords) {
      drawPixelBlock(coords.blockX, coords.blockY, coords.horizontalPixelSize, coords.verticalPixelSize);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<HTMLCanvasElement>;
    const coords = getCanvasPixelCoords(mouseEvent);
    if (coords) {
      drawPixelBlock(coords.blockX, coords.blockY, coords.horizontalPixelSize, coords.verticalPixelSize);
    }
  };

  const handleCanvasTouchEnd = () => {
    setIsDrawing(false);
  };

  const handleDownload = async (blob: Blob, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      if (isAndroid) {
        alert(
          '도안이 다운로드 되었습니다!\n\n갤러리에 저장하는 방법:\n\n' +
            '1. 알림창을 아래로 내려서 다운로드된 파일을 찾아주세요\n' +
            '2. 다운로드된 파일을 눌러주세요\n' +
            '3. "갤러리에 저장" 또는 "이미지 저장"을 선택해주세요\n\n' +
            '또는\n\n' +
            '1. 파일/파일관리자 앱을 열어주세요\n' +
            '2. Download 폴더를 열어주세요\n' +
            '3. 방금 저장된 이미지를 찾아 길게 눌러주세요\n' +
            '4. "갤러리에 저장"을 선택해주세요'
        );
      } else {
        alert('도안이 저장되었습니다!');
      }
    } catch (error) {
      console.error('다운로드 실패:', error);
      throw new Error('다운로드에 실패했습니다.');
    }
  };

  const handleSavePattern = async () => {
    if (!pixelatedImageData || !pixelDimensions) return;

    try {
      const fileName = `h2_craft_pattern_${Date.now()}.png`;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const base64Data = canvas.toDataURL('image/png', 1.0).split(',')[1];
      const binaryData = atob(base64Data);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([array], { type: 'image/png' });
      const file = new File([blob], fileName, { type: 'image/png' });

      if (isMobile && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: 'h2_craft 도안',
            text: 'h2_craft로 만든 도안입니다.',
          });
          alert('공유가 완료되었습니다!');
          router.push('/');
          return;
        } catch (error) {
          console.error('공유 실패:', error);
          await handleDownload(blob, fileName);
        }
      } else {
        await handleDownload(blob, fileName);
      }
    } catch (error) {
      console.error('도안 저장 실패:', error);
      alert('도안 저장에 실패했습니다.');
    }
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (canvas && originalPixelatedData) {
      const img = document.createElement('img');
      img.onload = () => {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // 색상 전용 캔버스도 복원 (격자 제거한 버전)
          const colorCanvas = colorOnlyCanvasRef.current;
          if (colorCanvas) {
            const colorCtx = colorCanvas.getContext('2d', { alpha: false });
            if (colorCtx) {
              // 원본에서 격자 없는 색상만 다시 그리기
              colorCtx.drawImage(img, 0, 0);
            }
          }

          setPixelatedImageData(canvas.toDataURL());
        }
      };
      img.src = originalPixelatedData;
    }
    setSelectedColor(null);
  };

  return (
    <div className={styles.container}>
      <h1>Make Your Own Pattern</h1>

      {isProcessing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>이미지 처리 중...</p>
        </div>
      )}

      {!pixelatedImageData && (
        <div className={styles.uploadSection}>
          <GaugeInput onGaugeSubmit={handleGaugeSubmit} />

          <div className="mt-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              className={styles.fileInput}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadButton}
            >
              Upload Image
            </button>
          </div>
        </div>
      )}

      {image && (
        <div className={styles.imageSection}>
          <div className={styles.controls}>
            <div className={styles.controlItem}>
              <label>색상 개수:</label>
              <input
                type="range"
                min="2"
                max="7"
                value={colorCount}
                onChange={(e) => {
                  setColorCount(Number(e.target.value));
                }}
                className={styles.slider}
                disabled={isEditing || isProcessing}
              />
              <span>{colorCount}색</span>
            </div>

            <div className={styles.controlItem}>
              <label>픽셀 크기:</label>
              <input
                type="range"
                min="2"
                max="30"
                value={pixelSize}
                onChange={(e) => setPixelSize(Number(e.target.value))}
                className={styles.slider}
                disabled={isEditing || isProcessing}
              />
              <span>{pixelSize}px</span>
            </div>
          </div>

          <div className={isEditing ? styles.imageContainerSingle : styles.imageContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image || ''}
              alt="원본 이미지"
              className={styles.originalImage}
            />
            {pixelatedImageData && !isEditing && (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pixelatedImageData}
                  alt="픽셀화된 이미지"
                  className={styles.pixelatedImage}
                />
              </div>
            )}
          </div>

          {dominantColors.length > 0 && (
            <div className={styles.colorPalette}>
              {gauge ? (
                <div className={styles.patternSizeGrid}>
                  <div className={styles.patternSizeBox}>
                    <div className={styles.patternSizeLabel}>게이지</div>
                    <div className={styles.patternSizeValue}>
                      {gauge.horizontal} × {gauge.vertical}
                    </div>
                  </div>
                  <div className={styles.patternSizeBox}>
                    <div className={styles.patternSizeLabel}>코수</div>
                    <div className={styles.patternSizeValue}>
                      {pixelDimensions?.width} × {pixelDimensions?.height}
                    </div>
                  </div>
                  <div className={styles.patternSizeBox}>
                    <div className={styles.patternSizeLabel}>예상 크기</div>
                    <div className={styles.patternSizeValue}>
                      {((pixelDimensions?.width || 0) * 10 / gauge.horizontal).toFixed(1)} cm ×{' '}
                      {((pixelDimensions?.height || 0) * 10 / gauge.vertical).toFixed(1)} cm
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.patternSizeBox}>
                  <div className={styles.patternSizeLabel}>코수</div>
                  <div className={styles.patternSizeValue}>
                    {pixelDimensions?.width} × {pixelDimensions?.height}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '2rem' }}>
                <h3>주요 색상</h3>
                <div className={styles.colors}>
                  {dominantColors.map((color, index) => (
                    <div key={index} className={styles.colorItem}>
                      <div
                        className={styles.colorSwatch}
                        style={{
                          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                        }}
                      />
                      <div className={styles.colorInfo}>
                        <span>RGB({color.r}, {color.g}, {color.b})</span>
                        <span>{color.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={styles.actionButtons}>
            <button
              className={styles.saveButton}
              onClick={() => {
                if (isEditing) {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    setPixelatedImageData(canvas.toDataURL('image/png', 1.0));
                  }
                  setIsEditing(false);
                }
                handleSavePattern();
              }}
              disabled={isProcessing}
            >
              이대로 저장하기
            </button>
            {!isEditing && (
              <button
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
                disabled={isProcessing}
              >
                도안 수정하기
              </button>
            )}
            {isEditing && (
              <>
                <button
                  className={styles.editButton}
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      setPixelatedImageData(canvas.toDataURL('image/png', 1.0));
                    }
                    setIsEditing(false);
                  }}
                >
                  수정 완료
                </button>
                <button className={styles.resetButton} onClick={handleReset}>
                  되돌리기
                </button>
              </>
            )}
          </div>

          {isEditing && (
            <div className={styles.editMode}>
              <div className={styles.colorButtons}>
                {dominantColors.map((color, index) => (
                  <button
                    key={index}
                    className={`${styles.colorButton} ${
                      selectedColor &&
                      selectedColor.r === color.r &&
                      selectedColor.g === color.g &&
                      selectedColor.b === color.b
                        ? styles.selected
                        : ''
                    }`}
                    style={{
                      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                    }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              <p className={styles.editHint}>
                색상을 선택한 후 도안을 클릭하면 해당 픽셀의 색이 변경됩니다.
              </p>
            </div>
          )}
        </div>
      )}

      <div className={isEditing ? styles.canvasWrapper : styles.hiddenCanvas}>
        <canvas
          ref={canvasRef}
          className={styles.editableCanvas}
          onMouseDown={isEditing ? handleCanvasMouseDown : undefined}
          onMouseMove={isEditing ? handleCanvasMouseMove : undefined}
          onMouseUp={isEditing ? handleCanvasMouseUp : undefined}
          onMouseLeave={isEditing ? handleCanvasMouseUp : undefined}
          onTouchStart={isEditing ? handleCanvasTouchStart : undefined}
          onTouchMove={isEditing ? handleCanvasTouchMove : undefined}
          onTouchEnd={isEditing ? handleCanvasTouchEnd : undefined}
        />
      </div>
    </div>
  );
}
