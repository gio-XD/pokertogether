'use client';

import type { ClientPlayerState } from '@/lib/engine/types';
import type { GamePhase } from '@/lib/engine/types';
import { PokerCard } from '@/components/cards/card';

interface SeatProps {
  seatIndex: number;
  player: ClientPlayerState | null;
  isHero: boolean;
  isCurrentTurn: boolean;
  isWinner: boolean;
  winAmount: number;
  showdown: boolean;
  onSeatClick: () => void;
  isEmpty: boolean;
  gamePhase: GamePhase;
}

export function Seat({
  player,
  isHero,
  isCurrentTurn,
  isWinner,
  winAmount,
  showdown,
  onSeatClick,
  isEmpty,
  gamePhase,
}: SeatProps) {
  if (isEmpty) {
    return (
      <button
        onClick={onSeatClick}
        className="w-[72px] h-[50px] sm:w-[100px] sm:h-[70px] rounded-xl border-2 border-dashed border-white/20
          flex items-center justify-center cursor-pointer
          hover:border-[var(--gold)] hover:bg-white/5 transition-all duration-200"
      >
        <span className="text-white/30 text-xs">坐下</span>
      </button>
    );
  }

  if (!player) return null;

  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';
  const isSittingOut = player.status === 'sitting-out';

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Hole cards (above player info) */}
      {player.holeCards && gamePhase !== 'waiting' && (
        <div className="flex gap-0.5 mb-0.5">
          <PokerCard
            card={isHero || showdown ? player.holeCards[0] : null}
            faceDown={!isHero && !showdown}
            size="sm"
            delay={0}
          />
          <PokerCard
            card={isHero || showdown ? player.holeCards[1] : null}
            faceDown={!isHero && !showdown}
            size="sm"
            delay={100}
          />
        </div>
      )}

      {/* Player info box */}
      <div
        className={`relative w-[72px] sm:w-[100px] rounded-xl overflow-hidden transition-all duration-300
          ${isCurrentTurn ? 'ring-2 ring-[var(--gold)] shadow-[0_0_15px_var(--gold)]' : ''}
          ${isWinner ? 'animate-win' : ''}
          ${isFolded ? 'opacity-40' : ''}
          ${isSittingOut ? 'opacity-30' : ''}
        `}
        style={{
          background: isCurrentTurn
            ? 'linear-gradient(180deg, #2a3a4a 0%, #1a2a3a 100%)'
            : 'linear-gradient(180deg, #1e2530 0%, #151a22 100%)',
          border: `1px solid ${isCurrentTurn ? 'var(--gold)' : '#2a3040'}`,
        }}
      >
        {/* Timer bar */}
        {isCurrentTurn && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gray-700">
            <div
              className="h-full bg-[var(--gold)]"
              style={{ animation: 'timer-shrink 30s linear forwards' }}
            />
          </div>
        )}

        {/* Name */}
        <div className="px-2 pt-2 pb-0.5">
          <div className="text-[9px] sm:text-[11px] font-medium text-center truncate text-white/90">
            {player.name}
            {isHero && <span className="text-[var(--gold)] ml-0.5">*</span>}
          </div>
        </div>

        {/* Stack */}
        <div className="px-2 pb-1.5">
          <div className={`text-center text-xs font-bold ${
            isAllIn ? 'text-red-400' : 'text-[var(--gold)]'
          }`}>
            {isAllIn ? 'ALL IN' : `$${player.stack.toLocaleString()}`}
          </div>
        </div>

        {/* Status badges */}
        {isFolded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <span className="text-xs text-white/60 font-medium">FOLD</span>
          </div>
        )}

        {/* Disconnected indicator */}
        {!player.isConnected && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}

        {/* Ready indicator */}
        {gamePhase === 'waiting' && player.isReady && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-green-500/80 text-[8px] text-white font-bold">
            READY
          </div>
        )}
      </div>

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="mt-0.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/10">
          <span className="text-[10px] text-[var(--gold)] font-medium">
            ${player.currentBet}
          </span>
        </div>
      )}

      {/* Win amount */}
      {isWinner && winAmount > 0 && (
        <div className="mt-0.5 px-2 py-0.5 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]">
          <span className="text-xs text-[var(--gold)] font-bold">
            +${winAmount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
