/**
 * 색상 관련 유틸리티 함수들
 * Lab 색공간을 사용하여 인간의 색 인지에 맞는 색상 비교 제공
 */

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface ColorWithCount extends Color {
  count: number;
  percentage: number;
}

export interface LabColor {
  l: number;
  a: number;
  b: number;
}

// 색상 유사성 임계값 (컴포넌트 외부에 상수로 정의)
export const COLOR_SIMILARITY_THRESHOLD = 20;

// Lab 변환 캐시 (성능 최적화)
const labCache = new Map<string, LabColor>();

/**
 * 색상을 문자열 키로 변환
 */
export const colorKey = (c: Color): string => `${c.r},${c.g},${c.b}`;

/**
 * Lab 변환을 위한 보조 함수
 */
const f = (t: number): number => {
  return t > Math.pow(6 / 29, 3)
    ? Math.pow(t, 1 / 3)
    : (1 / 3) * Math.pow(29 / 6, 2) * t + 4 / 29;
};

/**
 * RGB 색상을 Lab 색공간으로 변환
 * Lab 색공간은 인간의 색 인지에 더 가까운 색상 거리 계산을 가능하게 함
 */
export const rgbToLab = (color: Color): LabColor => {
  const key = colorKey(color);

  // 캐시된 값이 있으면 반환
  const cached = labCache.get(key);
  if (cached) return cached;

  let r = color.r / 255;
  let g = color.g / 255;
  let b = color.b / 255;

  // sRGB to linear RGB
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // RGB to XYZ
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

  // D65 illuminant reference values
  const xn = 95.047;
  const yn = 100.0;
  const zn = 108.883;

  const lab: LabColor = {
    l: 116 * f(y / yn) - 16,
    a: 500 * (f(x / xn) - f(y / yn)),
    b: 200 * (f(y / yn) - f(z / zn)),
  };

  // 캐시에 저장
  labCache.set(key, lab);

  return lab;
};

/**
 * 두 색상 간의 거리 계산 (CIE76 Delta E)
 * Lab 색공간에서의 유클리드 거리
 */
export const getColorDistance = (color1: Color, color2: Color): number => {
  const lab1 = rgbToLab(color1);
  const lab2 = rgbToLab(color2);

  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
};

/**
 * 보색 계산
 */
export const getComplementaryColor = (color: Color): Color => ({
  r: 255 - color.r,
  g: 255 - color.g,
  b: 255 - color.b,
});

/**
 * 보색을 CSS rgba 문자열로 반환
 */
export const getComplementaryColorString = (
  r: number,
  g: number,
  b: number,
  alpha: number = 1
): string => {
  return `rgba(${255 - r}, ${255 - g}, ${255 - b}, ${alpha})`;
};

/**
 * 이미지 데이터에서 주요 색상 추출
 */
export const extractDominantColors = (
  imageData: ImageData,
  maxColors: number = 5,
  threshold: number = COLOR_SIMILARITY_THRESHOLD
): Color[] => {
  const data = imageData.data;
  const colorFrequency: { [key: string]: { color: Color; count: number } } = {};

  // 모든 픽셀의 색상 빈도 계산
  for (let i = 0; i < data.length; i += 4) {
    const color: Color = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
    };
    const key = colorKey(color);

    if (colorFrequency[key]) {
      colorFrequency[key].count++;
    } else {
      colorFrequency[key] = { color, count: 1 };
    }
  }

  // 유사한 색상 그룹화
  const groupSimilarColors = (
    colors: { color: Color; count: number }[]
  ): { color: Color; count: number }[] => {
    const groups: { color: Color; count: number }[] = [];

    colors.forEach((item) => {
      const similarGroup = groups.find(
        (group) => getColorDistance(group.color, item.color) < threshold
      );

      if (similarGroup) {
        // 가중 평균으로 색상 병합
        const totalCount = similarGroup.count + item.count;
        similarGroup.color = {
          r: Math.round(
            (similarGroup.color.r * similarGroup.count +
              item.color.r * item.count) /
              totalCount
          ),
          g: Math.round(
            (similarGroup.color.g * similarGroup.count +
              item.color.g * item.count) /
              totalCount
          ),
          b: Math.round(
            (similarGroup.color.b * similarGroup.count +
              item.color.b * item.count) /
              totalCount
          ),
        };
        similarGroup.count += item.count;
      } else {
        groups.push({ ...item });
      }
    });

    return groups;
  };

  const sortedColors = Object.values(colorFrequency).sort(
    (a, b) => b.count - a.count
  );

  const groupedColors = groupSimilarColors(sortedColors);

  return groupedColors
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((item) => item.color);
};

/**
 * 블록 내 픽셀들의 가중 평균 색상 계산
 */
export const getWeightedAverageColor = (colors: Color[]): Color => {
  if (colors.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  const weights = colors.map((_, i) => {
    const center = colors.length / 2;
    const distance = Math.abs(i - center);
    return 1 / (1 + distance);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return {
    r: Math.round(
      colors.reduce((sum, c, i) => sum + c.r * weights[i], 0) / totalWeight
    ),
    g: Math.round(
      colors.reduce((sum, c, i) => sum + c.g * weights[i], 0) / totalWeight
    ),
    b: Math.round(
      colors.reduce((sum, c, i) => sum + c.b * weights[i], 0) / totalWeight
    ),
  };
};

/**
 * 주어진 색상 팔레트에서 가장 가까운 색상 찾기
 */
export const findClosestColor = (
  targetColor: Color,
  palette: Color[]
): Color => {
  if (palette.length === 0) {
    return targetColor;
  }

  let closestColor = palette[0];
  let minDistance = getColorDistance(targetColor, palette[0]);

  for (let i = 1; i < palette.length; i++) {
    const distance = getColorDistance(targetColor, palette[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = palette[i];
    }
  }

  return closestColor;
};

/**
 * Lab 캐시 초기화 (메모리 관리용)
 */
export const clearLabCache = (): void => {
  labCache.clear();
};
