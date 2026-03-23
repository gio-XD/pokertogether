'use client';

import type { ClientPlayerState } from '@/lib/engine/types';

interface DealerButtonProps {
  dealerIndex: number;
  positions: { top: string; left: string }[];
  players: ClientPlayerState[];
}

export function DealerButton({ dealerIndex, positions, players }: DealerButtonProps) {
  const dealer = players.find(p => p.seatIndex === dealerIndex);
  if (!dealer) return null;

  // Find the position based on the dealer's seat index
  const seatIndexInPositions = dealer.seatIndex;
  const pos = positions[seatIndexInPositions];
  if (!pos) return null;

  // Offset the button slightly from the seat position
  const topNum = parseFloat(pos.top);
  const leftNum = parseFloat(pos.left);

  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
      style={{
        top: `${topNum - 8}%`,
        left: `${leftNum + 6}%`,
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #d4d4d4 100%)',
          color: '#1a1a1a',
          border: '2px solid #333',
        }}
      >
        D
      </div>
    </div>
  );
}
