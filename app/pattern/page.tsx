'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './pattern.module.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GaugeInput from '../components/GaugeInput';

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
  const isAndroid = /Android/i.test(navigator.userAgent);
  const [image, setImage] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState(20);
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
  const [gauge, setGauge] = useState<{ horizontal: number; vertical: number } | null>(null);

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

    // 캔버스 해상도 개선을 위한 디바이스 픽셀 비율 적용
    const dpr = window.devicePixelRatio || 1;
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

    // 게이지 비율을 반영한 픽셀 크기 계산
    const basePixelSize = pixelSize;
    const ratio = gauge ? gauge.horizontal / gauge.vertical : 1;
    const horizontalPixelSize = basePixelSize;
    const verticalPixelSize = Math.round(basePixelSize * ratio);

    // 픽셀 크기에 맞게 캔버스 크기 조정
    width = Math.floor(width / horizontalPixelSize) * horizontalPixelSize;
    height = Math.floor(height / verticalPixelSize) * verticalPixelSize;

    const pixelWidth = Math.floor(width / horizontalPixelSize);
    const pixelHeight = Math.floor(height / verticalPixelSize);
    setPixelDimensions({ width: pixelWidth, height: pixelHeight });

    // 캔버스 크기를 디바이스 픽셀 비율에 맞게 조정
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { alpha: false });
    if (!tempCtx) return;

    tempCanvas.width = width;
    tempCanvas.height = height;

    // 이미지 스무딩 품질 개선
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(img, 0, 0, width, height);

    ctx.imageSmoothingEnabled = false;

    const imageData = tempCtx.getImageData(0, 0, width, height);
    const dominantColors = extractDominantColors(imageData, colorCount);
    
    // 색상 사용 빈도 계산
    const colorCounts: { [key: string]: number } = {};

    for (let y = 0; y < canvas.height / dpr; y += verticalPixelSize) {
      for (let x = 0; x < canvas.width / dpr; x += horizontalPixelSize) {
        const blockColors: Color[] = [];

        // 블록 내의 픽셀 색상 수집
        for (let py = y; py < Math.min(y + verticalPixelSize, canvas.height / dpr); py++) {
          for (let px = x; px < Math.min(x + horizontalPixelSize, canvas.width / dpr); px++) {
            const i = (py * canvas.width / dpr + px) * 4;
            blockColors.push({
              r: imageData.data[i],
              g: imageData.data[i + 1],
              b: imageData.data[i + 2]
            });
          }
        }

        // 블록의 평균 색상 계산 (중앙값 대신 가중 평균 사용)
        const getWeightedAverageColor = (colors: Color[]): Color => {
          const weights = colors.map((_, i) => {
            const center = colors.length / 2;
            const distance = Math.abs(i - center);
            return 1 / (1 + distance);
          });
          
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          
          return {
            r: Math.round(colors.reduce((sum, c, i) => sum + c.r * weights[i], 0) / totalWeight),
            g: Math.round(colors.reduce((sum, c, i) => sum + c.g * weights[i], 0) / totalWeight),
            b: Math.round(colors.reduce((sum, c, i) => sum + c.b * weights[i], 0) / totalWeight)
          };
        };

        const blockColor = getWeightedAverageColor(blockColors);

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
        ctx.fillRect(x, y, horizontalPixelSize, verticalPixelSize);

        // 그리드 그리기 (보색 사용)
        const complementaryR = 255 - closestColor.r;
        const complementaryG = 255 - closestColor.g;
        const complementaryB = 255 - closestColor.b;
        ctx.strokeStyle = `rgba(${complementaryR}, ${complementaryG}, ${complementaryB}, 1)`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, horizontalPixelSize, verticalPixelSize);

        // 색상 사용 빈도 카운트
        const colorKey = `${closestColor.r},${closestColor.g},${closestColor.b}`;
        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
      }
    }

    // 색상 사용 비율 계산 및 정렬
    const totalBlocks = Math.ceil(canvas.width / horizontalPixelSize) * Math.ceil(canvas.height / verticalPixelSize);
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
  }, [canvasRef, colorCount, extractDominantColors, getColorDistance, gauge]);

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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / img.offsetWidth;
    const scaleY = canvas.height / img.offsetHeight;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    const basePixelSize = pixelSize;
    const ratio = gauge ? gauge.horizontal / gauge.vertical : 1;
    const horizontalPixelSize = basePixelSize;
    const verticalPixelSize = Math.round(basePixelSize * ratio);

    const blockX = Math.floor(canvasX / horizontalPixelSize) * horizontalPixelSize;
    const blockY = Math.floor(canvasY / verticalPixelSize) * verticalPixelSize;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // 선택한 색상으로 픽셀 블록 채우기
    ctx.fillStyle = `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`;
    ctx.fillRect(blockX, blockY, horizontalPixelSize, verticalPixelSize);

    // 보색으로 테두리 그리기
    const complementaryR = 255 - selectedColor.r;
    const complementaryG = 255 - selectedColor.g;
    const complementaryB = 255 - selectedColor.b;
    ctx.strokeStyle = `rgba(${complementaryR}, ${complementaryG}, ${complementaryB}, 1)`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(blockX, blockY, horizontalPixelSize, verticalPixelSize);

    // 이미지 데이터 업데이트
    setPixelatedImageData(canvas.toDataURL());
  };

  // 도안 저장 함수
  const handleSavePattern = async () => {
    if (!pixelatedImageData || !pixelDimensions) return;

    try {
      const fileName = `h2_craft_pattern_${Date.now()}.png`;
      // 이미지 품질 개선을 위해 캔버스에서 직접 데이터 URL 생성
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

      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if ((isIOS || isAndroid) && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: 'h2_craft 도안',
            text: 'h2_craft로 만든 도안입니다.'
          });
          alert('공유가 완료되었습니다!');
          router.push('/');
          return;
        } catch (error) {
          console.error('공유 실패:', error);
          // 공유 실패 시 다운로드 방식으로 진행
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

  const handleDownload = async (blob: Blob, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        alert('도안이 다운로드 되었습니다!\n\n갤러리에 저장하는 방법:\n\n1. 알림창을 아래로 내려서 다운로드된 파일을 찾아주세요\n2. 다운로드된 파일을 눌러주세요\n3. "갤러리에 저장" 또는 "이미지 저장"을 선택해주세요\n\n또는\n\n1. 파일/파일관리자 앱을 열어주세요\n2. Download 폴더를 열어주세요\n3. 방금 저장된 이미지를 찾아 길게 눌러주세요\n4. "갤러리에 저장"을 선택해주세요');
      } else {
        alert('도안이 저장되었습니다!');
      }
    } catch (error) {
      console.error('다운로드 실패:', error);
      throw new Error('다운로드에 실패했습니다.');
    }
  };

  // 되돌리기 핸들러 수정
  const handleReset = () => {
    const canvas = canvasRef.current;
    if (canvas && originalPixelatedData) {
      const img = document.createElement('img');
      img.onload = () => {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // 모든 픽셀에 대해 보색 테두리 다시 그리기
          const basePixelSize = pixelSize;
          const ratio = gauge ? gauge.horizontal / gauge.vertical : 1;
          const horizontalPixelSize = basePixelSize;
          const verticalPixelSize = Math.round(basePixelSize * ratio);

          for (let y = 0; y < canvas.height; y += verticalPixelSize) {
            for (let x = 0; x < canvas.width; x += horizontalPixelSize) {
              // 현재 픽셀의 색상 가져오기
              const imageData = ctx.getImageData(x + 1, y + 1, 1, 1).data;
              const color = {
                r: imageData[0],
                g: imageData[1],
                b: imageData[2]
              };

              // 보색으로 테두리 그리기
              const complementaryR = 255 - color.r;
              const complementaryG = 255 - color.g;
              const complementaryB = 255 - color.b;
              ctx.strokeStyle = `rgba(${complementaryR}, ${complementaryG}, ${complementaryB}, 1)`;
              ctx.lineWidth = 0.5;
              ctx.strokeRect(x, y, horizontalPixelSize, verticalPixelSize);
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
              {gauge ? (
                <div className={styles.patternSizeGrid}>
                  <div className={styles.patternSizeBox}>
                    <div className={styles.patternSizeLabel}>게이지</div>
                    <div className={styles.patternSizeValue}>{gauge.horizontal} × {gauge.vertical}</div>
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
                      {((pixelDimensions?.width || 0) * 10 / gauge.horizontal).toFixed(1)} cm × {((pixelDimensions?.height || 0) * 10 / gauge.vertical).toFixed(1)} cm
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
            {isAndroid ? (
              <>
                <button 
                  className={styles.saveButton}
                  onClick={handleSavePattern}
                >
                  이대로 저장하기
                </button>
              </>
            ) : (
              <button 
                className={styles.saveButton}
                onClick={handleSavePattern}
              >
                이대로 저장하기
              </button>
            )}
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