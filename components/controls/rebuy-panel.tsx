'use client';

import { useState } from 'react';
import { useSocket } from '@/components/providers/socket-provider';

interface RebuyPanelProps {
  buyIn: number;
  maxRebuy: number;
}

export function RebuyPanel({ buyIn, maxRebuy }: RebuyPanelProps) {
  const { socket } = useSocket();
  const effectiveMax = maxRebuy > 0 ? maxRebuy : buyIn;
  const maxCount = Math.floor(effectiveMax / buyIn);
  const [count, setCount] = useState(maxCount);
  const [open, setOpen] = useState(false);
  const amount = count * buyIn;

  const handleRebuy = () => {
    if (amount <= 0 || amount > effectiveMax) return;
    socket?.emit('table:rebuy', { amount });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => { setCount(maxCount); setOpen(true); }}
        className="px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-600 text-white
          hover:brightness-110 active:scale-95 transition-all"
      >
        买入
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setCount(h => Math.max(1, h - 1))}
          disabled={count <= 1}
          className="w-7 h-7 rounded-lg bg-white/10 text-white font-bold text-sm
            hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          -
        </button>
        <input
          type="number"
          min={1}
          max={maxCount}
          value={count}
          onChange={e => {
            const v = Math.max(1, Math.min(maxCount, Math.floor(Number(e.target.value)) || 1));
            setCount(v);
          }}
          className="w-14 text-center px-1 py-1 rounded-lg bg-black/30 border border-white/10
            text-white text-sm focus:outline-none focus:border-[var(--gold)] transition-colors
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => setCount(h => Math.min(maxCount, h + 1))}
          disabled={count >= maxCount}
          className="w-7 h-7 rounded-lg bg-white/10 text-white font-bold text-sm
            hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          +
        </button>
      </div>
      <span className="text-xs text-white/30">份</span>
      <span className="text-sm text-[var(--gold)] font-bold">{amount}</span>
      <button
        onClick={handleRebuy}
        className="px-4 py-2 rounded-xl font-bold text-sm bg-[var(--action-call)] text-white
          hover:brightness-110 active:scale-95 transition-all"
      >
        确认
      </button>
      <button
        onClick={() => setOpen(false)}
        className="px-2 py-2 rounded-xl text-sm text-white/40 hover:text-white transition-all"
      >
        取消
      </button>
    </div>
  );
}
