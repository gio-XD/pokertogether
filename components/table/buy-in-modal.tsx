'use client';

import { useState } from 'react';

interface BuyInModalProps {
  minBuyIn: number;
  maxBuyIn: number;
  bigBlind: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export function BuyInModal({ minBuyIn, maxBuyIn, bigBlind, onConfirm, onCancel }: BuyInModalProps) {
  const [amount, setAmount] = useState(Math.floor((minBuyIn + maxBuyIn) / 2));

  const presets = [
    { label: `${20}BB`, amount: bigBlind * 20 },
    { label: `${50}BB`, amount: bigBlind * 50 },
    { label: `${80}BB`, amount: bigBlind * 80 },
    { label: `${100}BB`, amount: bigBlind * 100 },
  ].filter(p => p.amount >= minBuyIn && p.amount <= maxBuyIn);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-6 w-80">
        <h2 className="text-lg font-bold text-white mb-1">买入</h2>
        <p className="text-xs text-white/40 mb-5">
          范围: ${minBuyIn.toLocaleString()} - ${maxBuyIn.toLocaleString()}
        </p>

        {/* Slider */}
        <div className="mb-4">
          <input
            type="range"
            min={minBuyIn}
            max={maxBuyIn}
            step={bigBlind}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-gray-700 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/30">${minBuyIn}</span>
            <span className="text-sm font-bold text-[var(--gold)]">${amount.toLocaleString()}</span>
            <span className="text-[10px] text-white/30">${maxBuyIn}</span>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-5">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => setAmount(p.amount)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                amount === p.amount
                  ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/40'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm text-white/50 bg-white/5
              hover:bg-white/10 transition-all"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(amount)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white
              hover:brightness-110 active:scale-[0.98] transition-all"
            style={{ background: 'var(--action-call)' }}
          >
            坐下 ${amount.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}
