'use client';

import { useState } from 'react';
import type { ClientGameState } from '@/lib/engine/types';
import { useGame } from '@/components/providers/game-provider';
import { RaiseSlider } from './raise-slider';

interface ActionBarProps {
  gameState: ClientGameState;
  playerId: string;
}

export function ActionBar({ gameState, playerId }: ActionBarProps) {
  const { sendAction } = useGame();
  const [showRaise, setShowRaise] = useState(false);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const validActions = gameState.validActions;
  const player = gameState.players.find(p => p.id === playerId);

  if (!isMyTurn || !player) {
    return (
      <div className="h-16 sm:h-20 bg-[var(--panel-bg)] border-t border-[var(--panel-border)] flex items-center justify-center">
        <span className="text-white/30 text-xs sm:text-sm">
          {gameState.phase === 'showdown' ? '摊牌中...' : '等待对手行动...'}
        </span>
      </div>
    );
  }

  const toCall = gameState.currentBet - player.currentBet;
  const canCheck = validActions.includes('check');
  const canCall = validActions.includes('call');
  const canRaise = validActions.includes('raise');
  const canAllIn = validActions.includes('all-in');

  const handleFold = () => { sendAction('fold'); setShowRaise(false); };
  const handleCheck = () => { sendAction('check'); setShowRaise(false); };
  const handleCall = () => { sendAction('call'); setShowRaise(false); };
  const handleRaise = (amount: number) => { sendAction('raise', amount); setShowRaise(false); };
  const handleAllIn = () => { sendAction('all-in'); setShowRaise(false); };

  return (
    <div className="bg-[var(--panel-bg)] border-t border-[var(--panel-border)] px-2 sm:px-4 py-2 sm:py-3">
      {/* Raise slider */}
      {showRaise && canRaise && (
        <RaiseSlider
          minRaise={gameState.currentBet + gameState.minRaise}
          maxRaise={player.stack + player.currentBet}
          pot={gameState.pot}
          currentBet={gameState.currentBet}
          onRaise={handleRaise}
          onCancel={() => setShowRaise(false)}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3">
        {/* Fold */}
        <button
          onClick={handleFold}
          className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all
            hover:brightness-110 active:scale-95"
          style={{ background: 'var(--action-fold)' }}
        >
          弃牌
        </button>

        {/* Check / Call */}
        {canCheck ? (
          <button
            onClick={handleCheck}
            className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all
              hover:brightness-110 active:scale-95 sm:min-w-[100px]"
            style={{ background: 'var(--action-call)' }}
          >
            过牌
          </button>
        ) : canCall ? (
          <button
            onClick={handleCall}
            className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all
              hover:brightness-110 active:scale-95 sm:min-w-[100px]"
            style={{ background: 'var(--action-call)' }}
          >
            跟注 ${Math.min(toCall, player.stack)}
          </button>
        ) : null}

        {/* Raise */}
        {canRaise && (
          <button
            onClick={() => setShowRaise(!showRaise)}
            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all
              hover:brightness-110 active:scale-95 sm:min-w-[100px]
              ${showRaise ? 'ring-2 ring-white/30' : ''}`}
            style={{ background: 'var(--action-raise)' }}
          >
            加注
          </button>
        )}

        {/* All-in */}
        {canAllIn && (
          <button
            onClick={handleAllIn}
            className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all
              hover:brightness-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            }}
          >
            全下
          </button>
        )}
      </div>
    </div>
  );
}
