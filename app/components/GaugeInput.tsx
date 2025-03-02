'use client';

import { useState } from 'react';

interface GaugeInputProps {
  onGaugeSubmit: (horizontalGauge: number, verticalGauge: number) => void;
}

export default function GaugeInput({ onGaugeSubmit }: GaugeInputProps) {
  const [horizontalGauge, setHorizontalGauge] = useState<number>(0);
  const [verticalGauge, setVerticalGauge] = useState<number>(0);
  const [useCustomGauge, setUseCustomGauge] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useCustomGauge) {
      // 값이 없거나 0인 경우 기본값 10 사용
      const hGauge = horizontalGauge <= 0 ? 10 : horizontalGauge;
      const vGauge = verticalGauge <= 0 ? 10 : verticalGauge;
      onGaugeSubmit(hGauge, vGauge);
    } else {
      onGaugeSubmit(10, 10);
    }
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="p-6 bg-white rounded-[15px] shadow-md">
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-color)' }}>
            게이지가 설정되었습니다 ({useCustomGauge ? `${horizontalGauge || 10}:${verticalGauge || 10}` : '1:1'})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-[15px] shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium" style={{ color: 'var(--text-color)' }}>게이지 설정</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={useCustomGauge}
            onChange={(e) => {
              setUseCustomGauge(e.target.checked);
              if (!e.target.checked) {
                onGaugeSubmit(10, 10);
                setIsSubmitted(true);
              }
            }}
            className="form-checkbox h-4 w-4"
            style={{ color: 'var(--primary-color)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-color)' }}>
            커스텀 게이지 사용
          </span>
        </label>
      </div>

      {useCustomGauge && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-color)' }}>
            10cm 안에 들어가는 코의 수를 입력해주세요.
            <br />
            <span className="text-xs text-gray-500">(입력하지 않으면 기본값 10이 적용됩니다)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="horizontal" className="text-sm block mb-2" style={{ color: 'var(--text-color)' }}>
                가로 게이지
              </label>
              <input
                id="horizontal"
                type="number"
                min="1"
                value={horizontalGauge || ''}
                onChange={(e) => setHorizontalGauge(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--primary-color)' }}
                placeholder="예: 34"
              />
            </div>
            <div>
              <label htmlFor="vertical" className="text-sm block mb-2" style={{ color: 'var(--text-color)' }}>
                세로 게이지
              </label>
              <input
                id="vertical"
                type="number"
                min="1"
                value={verticalGauge || ''}
                onChange={(e) => setVerticalGauge(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--primary-color)' }}
                placeholder="예: 37"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'white'
            }}
          >
            게이지 적용하기
          </button>
        </form>
      )}
    </div>
  );
} 