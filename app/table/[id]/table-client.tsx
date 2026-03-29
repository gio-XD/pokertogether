'use client';

import { useEffect, useState } from 'react';
import { SocketProvider, useSocket } from '@/components/providers/socket-provider';
import { GameProvider, useGame } from '@/components/providers/game-provider';
import { PokerTable } from '@/components/table/poker-table';
import { ChatPanel } from '@/components/chat/chat-panel';

function TableView({ tableId }: { tableId: string }) {
  const { socket, isConnected, playerId, playerName, setPlayerName } = useSocket();
  const { gameState, error } = useGame();
  const [showChat, setShowChat] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [hasSetName, setHasSetName] = useState(false);

  // If player hasn't set a name yet, show name input
  useEffect(() => {
    if (playerName && playerName.startsWith('Player_')) {
      setHasSetName(false);
    } else if (playerName) {
      setHasSetName(true);
    }
  }, [playerName]);

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/50 text-lg">连接中...</div>
      </div>
    );
  }

  if (!hasSetName) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-8 w-80">
          <h2 className="text-xl font-bold text-white mb-4 text-center">设置昵称</h2>
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="输入你的昵称..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white
              placeholder-white/30 focus:outline-none focus:border-[var(--gold)] transition-colors"
            onKeyDown={e => {
              if (e.key === 'Enter' && nameInput.trim()) {
                setPlayerName(nameInput.trim());
                setHasSetName(true);
              }
            }}
          />
          <button
            onClick={() => {
              if (nameInput.trim()) {
                setPlayerName(nameInput.trim());
                setHasSetName(true);
              }
            }}
            disabled={!nameInput.trim()}
            className="w-full mt-3 px-4 py-3 rounded-xl font-bold text-white
              disabled:opacity-30 disabled:cursor-not-allowed
              hover:brightness-110 active:scale-[0.98] transition-all"
            style={{ background: 'var(--action-call)' }}
          >
            确认
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex relative overflow-hidden">
      {/* Main table area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="h-10 sm:h-12 bg-[var(--panel-bg)] border-b border-[var(--panel-border)]
          flex items-center justify-between px-2 sm:px-4">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <a href="/lobby" className="text-white/50 hover:text-white transition-colors text-xs sm:text-sm">
              ← 大厅
            </a>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm text-white/70 hidden sm:inline">
              {gameState?.mode === 'short-deck' ? '短牌' : '常规'}德州
            </span>
            {gameState && (
              <span className="text-[10px] sm:text-xs text-white/40">
                {gameState.smallBlind}/{gameState.bigBlind}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs text-white/40 hidden sm:inline">{playerName}</span>
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs text-white/50 hover:text-white
                bg-white/5 hover:bg-white/10 transition-all"
            >
              {showChat ? '关闭' : '聊天'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1">
          <PokerTable
            maxPlayers={gameState?.players.length ? Math.max(6, gameState.players.length + 1) : 6}
            tableId={tableId}
          />
        </div>
      </div>

      {/* Chat panel */}
      {showChat && <ChatPanel />}

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg
          bg-red-600/90 text-white text-sm font-medium shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  );
}

export function TableClient({ tableId }: { tableId: string }) {
  return (
    <SocketProvider>
      <GameProvider tableId={tableId}>
        <div className="h-screen flex flex-col bg-[var(--background)]">
          <TableView tableId={tableId} />
        </div>
      </GameProvider>
    </SocketProvider>
  );
}
