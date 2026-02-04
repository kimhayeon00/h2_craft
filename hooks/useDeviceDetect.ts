/**
 * 디바이스 감지 훅
 * SSR 환경에서 안전하게 디바이스 타입을 감지
 */

import { useState, useEffect } from 'react';

interface DeviceInfo {
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  userAgent: string;
}

const defaultDeviceInfo: DeviceInfo = {
  isAndroid: false,
  isIOS: false,
  isMobile: false,
  isDesktop: true,
  userAgent: '',
};

/**
 * 디바이스 타입을 감지하는 커스텀 훅
 * SSR 환경에서도 안전하게 동작 (navigator 접근을 useEffect 내에서만 수행)
 */
export const useDeviceDetect = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(defaultDeviceInfo);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isMobile = isAndroid || isIOS || /webOS|BlackBerry|Opera Mini|IEMobile/i.test(userAgent);

    setDeviceInfo({
      isAndroid,
      isIOS,
      isMobile,
      isDesktop: !isMobile,
      userAgent,
    });
  }, []);

  return deviceInfo;
};

/**
 * Web Share API 지원 여부 확인
 */
export const useCanShare = (): boolean => {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  return canShare;
};

/**
 * 파일 공유 가능 여부 확인
 */
export const useCanShareFiles = (): boolean => {
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    const checkFileShare = async () => {
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        // 테스트용 더미 파일로 확인
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        try {
          const canShare = navigator.canShare({ files: [testFile] });
          setCanShareFiles(canShare);
        } catch {
          setCanShareFiles(false);
        }
      }
    };

    checkFileShare();
  }, []);

  return canShareFiles;
};

export default useDeviceDetect;
