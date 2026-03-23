'use client';

import type { Card as CardType } from '@/lib/engine/types';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: '#e53e3e',
  diamonds: '#e53e3e',
  clubs: '#1a1a2e',
  spades: '#1a1a2e',
};

const RANK_DISPLAY: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

interface CardProps {
  card: CardType | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  highlight?: boolean;
}

const SIZES = {
  sm: { w: 40, h: 56, text: 'text-xs', symbol: 'text-[10px]' },
  md: { w: 52, h: 72, text: 'text-sm', symbol: 'text-xs' },
  lg: { w: 68, h: 96, text: 'text-base', symbol: 'text-sm' },
};

export function PokerCard({ card, faceDown = false, size = 'md', delay = 0, highlight = false }: CardProps) {
  const s = SIZES[size];

  if (!card || faceDown) {
    return (
      <div
        className="animate-deal rounded-lg shadow-lg flex items-center justify-center"
        style={{
          width: s.w,
          height: s.h,
          animationDelay: `${delay}ms`,
          background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 50%, #1a365d 100%)',
          border: '2px solid #4a5568',
        }}
      >
        <div className="text-gray-400 text-lg font-bold opacity-30">♠</div>
      </div>
    );
  }

  const suitColor = SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <div
      className={`animate-deal rounded-lg shadow-lg relative overflow-hidden ${
        highlight ? 'ring-2 ring-[var(--gold)] animate-win' : ''
      }`}
      style={{
        width: s.w,
        height: s.h,
        animationDelay: `${delay}ms`,
        background: '#fafafa',
        border: '1px solid #d1d5db',
      }}
    >
      {/* Top-left rank and suit */}
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span className={`${s.text} font-bold`} style={{ color: suitColor }}>
          {RANK_DISPLAY[card.rank]}
        </span>
        <span className={s.symbol} style={{ color: suitColor }}>
          {suitSymbol}
        </span>
      </div>

      {/* Center suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl'}`}
          style={{ color: isRed ? '#e53e3e' : '#2d3748' }}
        >
          {suitSymbol}
        </span>
      </div>

      {/* Bottom-right rank and suit (inverted) */}
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180">
        <span className={`${s.text} font-bold`} style={{ color: suitColor }}>
          {RANK_DISPLAY[card.rank]}
        </span>
        <span className={s.symbol} style={{ color: suitColor }}>
          {suitSymbol}
        </span>
      </div>
    </div>
  );
}
