'use client';

import { useState } from 'react';

interface RaiseSliderProps {
  minRaise: number;
  maxRaise: number;
  pot: number;
  currentBet: number;
  onRaise: (amount: number) => void;
  onCancel: () => void;
}

export function RaiseSlider({ minRaise, maxRaise, pot, currentBet, onRaise, onCancel }: RaiseSliderProps) {
  const [value, setValue] = useState(minRaise);

  const presets = [
    { label: '最小', amount: minRaise },
    { label: '1/2底池', amount: Math.min(currentBet + Math.floor(pot / 2), maxRaise) },
    { label: '底池', amount: Math.min(currentBet + pot, maxRaise) },
    { label: '2x底池', amount: Math.min(currentBet + pot * 2, maxRaise) },
  ];

  return (
    <div className="mb-3 p-3 rounded-xl bg-black/30 border border-[var(--panel-border)]">
      <div className="flex items-center gap-3 mb-2">
        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none bg-gray-700 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex items-center gap-1 min-w-[80px]">
          <span className="text-[var(--gold)] font-bold text-sm">${value}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => setValue(Math.max(minRaise, Math.min(preset.amount, maxRaise)))}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-white/5 border border-white/10
              text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            {preset.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => onRaise(value)}
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white
            hover:brightness-110 active:scale-95 transition-all"
          style={{ background: 'var(--action-raise)' }}
        >
          加注到 ${value}
        </button>
      </div>
    </div>
  );
}
