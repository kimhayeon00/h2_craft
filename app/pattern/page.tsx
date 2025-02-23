'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './pattern.module.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Color {
  r: number;
  g: number;
  b: number;
}

interface ColorWithCount extends Color {
  count: number;
  percentage: number;
}

export default function PatternPage() {
  const [image, setImage] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState(8);
  const [pixelatedImageData, setPixelatedImageData] = useState<string | null>(null);
  const [dominantColors, setDominantColors] = useState<ColorWithCount[]>([]);
  const [pixelDimensions, setPixelDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [originalPixelatedData, setOriginalPixelatedData] = useState<string | null>(null);
  const [colorCount, setColorCount] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);

  // 색상 유사성 임계값을 더 낮게 조정
  const threshold = 20;

  const f = useCallback((t: number) => {
    return t > Math.pow(6/29, 3) 
      ? Math.pow(t, 1/3) 
      : (1/3) * Math.pow(29/6, 2) * t + 4/29;
  }, []);

  const rgbToLab = useCallback((color: Color) => {
    let r = color.r / 255;
    let g = color.g / 255;
    let b = color.b / 255;
    
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;
    
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;
    
    return {
      l: 116 * f(y/yn) - 16,
      a: 500 * (f(x/xn) - f(y/yn)),
      b: 200 * (f(y/yn) - f(z/zn))
    };
  }, [f]);

  const getColorDistance = useCallback((color1: Color, color2: Color) => {
    const lab1 = rgbToLab(color1);
    const lab2 = rgbToLab(color2);
    
    return Math.sqrt(
      Math.pow(lab1.l - lab2.l, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
    );
  }, [rgbToLab]);

  const extractDominantColors = useCallback((imageData: ImageData, maxColors: number = 5): Color[] => {
    const data = imageData.data;
    const colorFrequency: { [key: string]: { color: Color; count: number } } = {};
    
    for (let i = 0; i < data.length; i += 4) {
      const color = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2]
      };
      const key = `${color.r},${color.g},${color.b}`;
      
      if (colorFrequency[key]) {
        colorFrequency[key].count++;
      } else {
        colorFrequency[key] = { color, count: 1 };
      }
    }

    const groupSimilarColors = (colors: { color: Color; count: number }[]): { color: Color; count: number }[] => {
      const groups: { color: Color; count: number }[] = [];

      colors.forEach(item => {
        const similarGroup = groups.find(group => 
          getColorDistance(group.color, item.color) < threshold
        );

        if (similarGroup) {
          const totalCount = similarGroup.count + item.count;
          similarGroup.color = {
            r: Math.round((similarGroup.color.r * similarGroup.count + item.color.r * item.count) / totalCount),
            g: Math.round((similarGroup.color.g * similarGroup.count + item.color.g * item.count) / totalCount),
            b: Math.round((similarGroup.color.b * similarGroup.count + item.color.b * item.count) / totalCount)
          };
          similarGroup.count += item.count;
        } else {
          groups.push({ ...item });
        }
      });

      return groups;
    };

    const sortedColors = Object.values(colorFrequency)
      .sort((a, b) => b.count - a.count);

    const groupedColors = groupSimilarColors(sortedColors);

    const dominantColors = groupedColors
      .sort((a, b) => b.count - a.count)
      .slice(0, maxColors)
      .map(item => item.color);

    return dominantColors;
  }, [getColorDistance, threshold]);

  const pixelateImage = useCallback((img: HTMLImageElement, pixelSize: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false
    });
    if (!ctx) return;

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

    width = Math.floor(width / pixelSize) * pixelSize;
    height = Math.floor(height / pixelSize) * pixelSize;

    const pixelWidth = Math.floor(width / pixelSize);
    const pixelHeight = Math.floor(height / pixelSize);
    setPixelDimensions({ width: pixelWidth, height: pixelHeight });

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { alpha: false });
    if (!tempCtx) return;

    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(img, 0, 0, width, height);

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;

    const imageData = tempCtx.getImageData(0, 0, width, height);
    const dominantColors = extractDominantColors(imageData, colorCount);
    
    // 색상 사용 빈도 계산
    const colorCounts: { [key: string]: number } = {};

    for (let y = 0; y < canvas.height; y += pixelSize) {
      for (let x = 0; x < canvas.width; x += pixelSize) {
        const blockColors: Color[] = [];

        // 블록 내의 픽셀 색상 수집
        for (let py = y; py < Math.min(y + pixelSize, canvas.height); py++) {
          for (let px = x; px < Math.min(x + pixelSize, canvas.width); px++) {
            const i = (py * canvas.width + px) * 4;
            blockColors.push({
              r: imageData.data[i],
              g: imageData.data[i + 1],
              b: imageData.data[i + 2]
            });
          }
        }

        // 블록의 평균 색상 계산
        const getMedianColor = (colors: Color[]): Color => {
          const rs = colors.map(c => c.r).sort((a, b) => a - b);
          const gs = colors.map(c => c.g).sort((a, b) => a - b);
          const bs = colors.map(c => c.b).sort((a, b) => a - b);
          
          const mid = Math.floor(colors.length / 2);
          
          return {
            r: rs[mid],
            g: gs[mid],
            b: bs[mid]
          };
        };

        const blockColor = getMedianColor(blockColors);

        // 가장 가까운 주요 색상 찾기
        let closestColor = dominantColors[0];
        let minDistance = getColorDistance(blockColor, dominantColors[0]);

        for (let i = 1; i < dominantColors.length; i++) {
          const distance = getColorDistance(blockColor, dominantColors[i]);
          if (distance < minDistance) {
            minDistance = distance;
            closestColor = dominantColors[i];
          }
        }

        // 선택된 색상으로 블록 채우기
        ctx.fillStyle = `rgb(${closestColor.r}, ${closestColor.g}, ${closestColor.b})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);

        // 그리드 그리기
        ctx.strokeStyle = 'rgba(64, 64, 64, 1.0)';  // 더 진한 회색으로 변경
        ctx.lineWidth = 0.1;
        ctx.strokeRect(x, y, pixelSize, pixelSize);

        // 색상 사용 빈도 업데이트
        const colorKey = `${closestColor.r},${closestColor.g},${closestColor.b}`;
        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
      }
    }

    // 색상 사용 비율 계산 및 정렬
    const totalBlocks = Math.ceil(canvas.width / pixelSize) * Math.ceil(canvas.height / pixelSize);
    const colorsWithPercentage = Object.entries(colorCounts)
      .map(([key, count]) => {
        const [r, g, b] = key.split(',').map(Number);
        const percentage = (count / totalBlocks) * 100;
        return {
          r, g, b,
          count,
          percentage
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    setDominantColors(colorsWithPercentage);
    setPixelatedImageData(canvas.toDataURL());
  }, [canvasRef, colorCount, extractDominantColors, getColorDistance]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (image) {
      const img = document.createElement('img');
      img.onload = () => {
        pixelateImage(img, pixelSize);
        setOriginalPixelatedData(null);
      };
      img.src = image;
    }
  }, [image, pixelSize, colorCount, pixelateImage]);

  useEffect(() => {
    if (pixelatedImageData && !originalPixelatedData) {
      setOriginalPixelatedData(pixelatedImageData);
    }
  }, [pixelatedImageData, originalPixelatedData]);

  // 마우스 다운 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDrawing(true);
    handlePixelChange(e);  // 첫 클릭 시에도 색상 변경
  };

  // 마우스 업 핸들러
  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // 마우스 이동 핸들러
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    handlePixelChange(e);
  };

  // 픽셀 색상 변경 함수 (기존 handlePixelClick을 수정)
  const handlePixelChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedColor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const img = e.currentTarget.querySelector('img');
    if (!img) return;

    const rect = img.getBoundingClientRect();

    // 이미지 내에서의 클릭 위치를 계산
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 이미지 스케일 계산
    const scaleX = canvas.width / img.offsetWidth;
    const scaleY = canvas.height / img.offsetHeight;

    // 실제 캔버스 좌표로 변환
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    // 클릭한 위치의 픽셀 블록 찾기
    const blockX = Math.floor(canvasX / pixelSize) * pixelSize;
    const blockY = Math.floor(canvasY / pixelSize) * pixelSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 선택한 색상으로 픽셀 블록 채우기
    ctx.fillStyle = `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`;
    ctx.fillRect(blockX, blockY, pixelSize, pixelSize);

    // 그리드 다시 그리기
    ctx.strokeStyle = 'rgba(64, 64, 64, 1.0)';  // 더 진한 회색으로 변경
    ctx.lineWidth = 0.1;
    ctx.strokeRect(blockX, blockY, pixelSize, pixelSize);

    // 이미지 데이터 업데이트
    setPixelatedImageData(canvas.toDataURL());
  };

  // 도안 저장 함수
  const handleSavePattern = async () => {
    if (!pixelatedImageData || !pixelDimensions) return;

    try {
      const fileName = `h2_craft_pattern_${Date.now()}.png`;
      const base64Data = pixelatedImageData.split(',')[1];
      const binaryData = atob(base64Data);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([array], { type: 'image/png' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        alert('도안이 저장되었습니다!\n\n모바일에서 저장된 파일은:\niOS - Files 앱의 Downloads 폴더\nAndroid - Downloads 폴더\n에서 확인할 수 있습니다.');
      } else {
        alert('도안이 저장되었습니다!');
      }
      router.push('/');
    } catch (error) {
      console.error('도안 저장 실패:', error);
      alert('도안 저장에 실패했습니다.');
    }
  };

  // 되돌리기 핸들러 수정
  const handleReset = () => {
    setPixelatedImageData(originalPixelatedData);
    setSelectedColor(null);
    const canvas = canvasRef.current;
    if (canvas && originalPixelatedData) {
      const img = document.createElement('img');
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = originalPixelatedData;
    }
  };

  return (
    <div className={styles.container}>
      <h1>Make Your Own Pattern</h1>
      
      {!image && (  // 이미지가 없을 때만 업로드 섹션 표시
        <div className={styles.uploadSection}>
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
                disabled={isEditing}
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
                disabled={isEditing}
              />
              <span>{pixelSize}px</span>
            </div>
          </div>
          
          <div className={styles.imageContainer}>
            <Image 
              src={image || ''} 
              alt="원본 이미지"
              className={styles.originalImage}
              width={800}
              height={600}
            />
            {pixelatedImageData && (
              <Image 
                src={pixelatedImageData}
                alt="픽셀화된 이미지"
                className={styles.pixelatedImage}
                width={800}
                height={600}
              />
            )}
          </div>

          {dominantColors.length > 0 && (
            <div className={styles.colorPalette}>
              <h3>도안 크기</h3>
              <div>
                <span>가로: {pixelDimensions?.width}</span>
                <span>, 세로: {pixelDimensions?.height} </span>
              </div>
              <div style={{ marginTop: '2rem' }}>
                <h3>주요 색상</h3>
                <div className={styles.colors}>
                  {dominantColors.map((color, index) => (
                    <div key={index} className={styles.colorItem}>
                      <div 
                        className={styles.colorSwatch}
                        style={{
                          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`
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
              onClick={handleSavePattern}
            >
              이대로 저장하기
            </button>
            {!isEditing && (
              <button 
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                도안 수정하기
              </button>
            )}
            {isEditing && (
              <button 
                className={styles.resetButton}
                onClick={handleReset}
              >
                되돌리기
              </button>
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
                      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`
                    }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              <div 
                className={styles.editableImage}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <Image 
                  src={pixelatedImageData || ''}
                  alt="수정 가능한 도안"
                  className={styles.pixelatedImage}
                  width={800}
                  height={600}
                  draggable={false}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
} 