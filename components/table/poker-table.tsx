'use client';

import { useGame } from '@/components/providers/game-provider';
import { useSocket } from '@/components/providers/socket-provider';
import { Seat } from './seat';
import { CommunityCards } from './community-cards';
import { PotDisplay } from './pot-display';
import { DealerButton } from './dealer-button';
import { ActionBar } from '@/components/controls/action-bar';

// Seat positions around the oval table (percentage based)
// Optimized for up to 9 players, GGPoker-style layout
const SEAT_POSITIONS: Record<number, { top: string; left: string }[]> = {
  2: [
    { top: '78%', left: '50%' },   // bottom center (hero)
    { top: '12%', left: '50%' },   // top center
  ],
  3: [
    { top: '78%', left: '50%' },
    { top: '20%', left: '20%' },
    { top: '20%', left: '80%' },
  ],
  4: [
    { top: '78%', left: '50%' },
    { top: '50%', left: '5%' },
    { top: '12%', left: '50%' },
    { top: '50%', left: '95%' },
  ],
  5: [
    { top: '78%', left: '50%' },
    { top: '65%', left: '8%' },
    { top: '20%', left: '15%' },
    { top: '20%', left: '85%' },
    { top: '65%', left: '92%' },
  ],
  6: [
    { top: '78%', left: '50%' },
    { top: '65%', left: '8%' },
    { top: '20%', left: '15%' },
    { top: '12%', left: '50%' },
    { top: '20%', left: '85%' },
    { top: '65%', left: '92%' },
  ],
  7: [
    { top: '78%', left: '50%' },
    { top: '70%', left: '8%' },
    { top: '30%', left: '5%' },
    { top: '12%', left: '30%' },
    { top: '12%', left: '70%' },
    { top: '30%', left: '95%' },
    { top: '70%', left: '92%' },
  ],
  8: [
    { top: '78%', left: '50%' },
    { top: '70%', left: '10%' },
    { top: '35%', left: '3%' },
    { top: '12%', left: '25%' },
    { top: '12%', left: '50%' },
    { top: '12%', left: '75%' },
    { top: '35%', left: '97%' },
    { top: '70%', left: '90%' },
  ],
  9: [
    { top: '78%', left: '50%' },
    { top: '75%', left: '12%' },
    { top: '45%', left: '3%' },
    { top: '15%', left: '15%' },
    { top: '8%', left: '38%' },
    { top: '8%', left: '62%' },
    { top: '15%', left: '85%' },
    { top: '45%', left: '97%' },
    { top: '75%', left: '88%' },
  ],
};

interface PokerTableProps {
  maxPlayers: number;
  tableId: string;
}

export function PokerTable({ maxPlayers, tableId }: PokerTableProps) {
  const { gameState, winners, showdown } = useGame();
  const { playerId, socket } = useSocket();

  const positions = SEAT_POSITIONS[maxPlayers] || SEAT_POSITIONS[9];

  const handleSeatClick = (seatIndex: number) => {
    if (!socket) return;
    if (gameState) {
      const occupied = gameState.players.find(p => p.seatIndex === seatIndex);
      if (occupied) return;
    }
    // Fixed buy-in from table config (minBuyIn = maxBuyIn for fixed tables)
    socket.emit('table:join', {
      tableId,
      seatIndex,
      buyIn: 0, // server uses table's configured buyIn
    });
  };

  const isPlayerSeated = gameState?.players.some(p => p.id === playerId);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Table area */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8">
        {/* Table container (seats are outside the clip to avoid card clipping) */}
        <div className="relative w-full max-w-[900px] aspect-[16/9]">
          {/* Outer rail */}
          <div
            className="absolute inset-0 rounded-[50%]"
            style={{
              background: 'linear-gradient(180deg, #4a3728 0%, #2d1b0e 50%, #4a3728 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.1)',
            }}
          >
            {/* Table felt */}
            <div
              className="absolute inset-3 rounded-[50%] overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at 50% 40%, #1f7a4c 0%, #1a5c3a 40%, #145030 70%, #0f3d24 100%)',
                boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              {/* Felt texture pattern */}
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                }}
              />

              {/* Table center line / logo area */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/10 text-3xl font-bold tracking-widest select-none">
                  POKER
                </div>
              </div>
            </div>
          </div>

          {/* Community cards — outside clip area */}
          {gameState && gameState.communityCards.length > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <CommunityCards cards={gameState.communityCards} />
            </div>
          )}

          {/* Pot display */}
          {gameState && gameState.pot > 0 && (
            <div className="absolute top-[32%] left-1/2 -translate-x-1/2 z-10">
              <PotDisplay amount={gameState.pot} />
            </div>
          )}

          {/* Dealer button */}
          {gameState && gameState.phase !== 'waiting' && (
            <DealerButton
              dealerIndex={gameState.dealerIndex}
              positions={positions}
              players={gameState.players}
            />
          )}

          {/* Seats — outside clip area so cards are never clipped */}
          {positions.map((pos, index) => {
            const player = gameState?.players.find(p => p.seatIndex === index);
            const isWinner = winners?.some(w => w.playerId === player?.id);
            const winAmount = winners
              ?.filter(w => w.playerId === player?.id)
              .reduce((sum, w) => sum + w.amount, 0);

            return (
              <div
                key={index}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: pos.top, left: pos.left }}
              >
                <Seat
                  seatIndex={index}
                    player={player || null}
                    isHero={player?.id === playerId}
                    isCurrentTurn={player?.isCurrentPlayer || false}
                    isWinner={isWinner || false}
                    winAmount={winAmount || 0}
                    showdown={showdown}
                    onSeatClick={() => handleSeatClick(index)}
                    isEmpty={!player}
                    gamePhase={gameState?.phase || 'waiting'}
                  />
                </div>
              );
            })}
        </div>
      </div>

      {/* Action bar at bottom */}
      {isPlayerSeated && gameState && gameState.phase !== 'waiting' && (
        <ActionBar gameState={gameState} playerId={playerId || ''} />
      )}

    </div>
  );
}
