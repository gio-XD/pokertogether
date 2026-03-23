'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SocketProvider, useSocket } from '@/components/providers/socket-provider';
import type { TableInfo, GameMode } from '@/lib/engine/types';

function LobbyView() {
  const { socket, isConnected, playerName, setPlayerName } = useSocket();
  const router = useRouter();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [hasSetName, setHasSetName] = useState(false);

  // Create table form
  const [tableName, setTableName] = useState('');
  const [mode, setMode] = useState<GameMode>('regular');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);

  useEffect(() => {
    if (playerName && !playerName.startsWith('Player_')) {
      setHasSetName(true);
    }
  }, [playerName]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('lobby:join');

    const onTableList = (list: TableInfo[]) => setTables(list);
    const onTableCreated = (data: { tableId: string }) => {
      router.push(`/table/${data.tableId}`);
    };

    socket.on('lobby:table-list', onTableList);
    socket.on('lobby:table-created', onTableCreated);

    return () => {
      socket.off('lobby:table-list', onTableList);
      socket.off('lobby:table-created', onTableCreated);
      socket.emit('lobby:leave');
    };
  }, [socket, isConnected, router]);

  const handleCreateTable = () => {
    socket?.emit('table:create', {
      name: tableName || undefined,
      mode,
      maxPlayers,
      smallBlind,
      bigBlind,
      minBuyIn: bigBlind * 20,
      maxBuyIn: bigBlind * 100,
    });
  };

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
          <h2 className="text-xl font-bold text-white mb-2 text-center">欢迎来到德州扑克</h2>
          <p className="text-white/40 text-sm mb-6 text-center">设置你的昵称开始游戏</p>
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="输入昵称..."
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
            进入大厅
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">德州扑克大厅</h1>
          <p className="text-sm text-white/40 mt-1">选择一张桌子或创建新桌</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50">{playerName}</span>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white
              hover:brightness-110 active:scale-95 transition-all"
            style={{ background: 'var(--action-call)' }}
          >
            + 创建牌桌
          </button>
        </div>
      </div>

      {/* Table list */}
      {tables.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4 opacity-20">♠</div>
            <p className="text-white/30 text-lg">暂无牌桌</p>
            <p className="text-white/20 text-sm mt-1">点击上方按钮创建第一张桌子</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tables.map(table => (
            <button
              key={table.id}
              onClick={() => router.push(`/table/${table.id}`)}
              className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)]
                rounded-xl p-4 flex items-center justify-between
                hover:bg-[var(--seat-active)] hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                  ${table.mode === 'short-deck' ? 'bg-orange-600/20 text-orange-400' : 'bg-green-600/20 text-green-400'}`}>
                  {table.mode === 'short-deck' ? '6+' : '♠'}
                </div>
                <div className="text-left">
                  <div className="text-white font-medium">{table.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {table.mode === 'short-deck' ? '短牌' : '常规'} · 盲注 ${table.smallBlind}/${table.bigBlind}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-white/70">
                    {table.playerCount}/{table.maxPlayers}
                  </div>
                  <div className="text-xs text-white/30">玩家</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                  table.status === 'playing'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {table.status === 'playing' ? '进行中' : '等待中'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create table modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-6 w-96">
            <h2 className="text-lg font-bold text-white mb-4">创建牌桌</h2>

            <div className="space-y-4">
              {/* Table name */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">桌名 (可选)</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={e => setTableName(e.target.value)}
                  placeholder="我的牌桌"
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white
                    placeholder-white/20 focus:outline-none focus:border-[var(--gold)] transition-colors"
                />
              </div>

              {/* Game mode */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">游戏模式</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('regular')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      mode === 'regular'
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-white/50 border border-white/10'
                    }`}
                  >
                    常规德州
                  </button>
                  <button
                    onClick={() => setMode('short-deck')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      mode === 'short-deck'
                        ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                        : 'bg-white/5 text-white/50 border border-white/10'
                    }`}
                  >
                    短牌 6+
                  </button>
                </div>
              </div>

              {/* Max players */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">最大人数: {maxPlayers}</label>
                <input
                  type="range"
                  min={2}
                  max={9}
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-gray-700 cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]
                    [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Blinds */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/50 mb-1 block">小盲</label>
                  <select
                    value={smallBlind}
                    onChange={e => {
                      const sb = Number(e.target.value);
                      setSmallBlind(sb);
                      setBigBlind(sb * 2);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white
                      focus:outline-none focus:border-[var(--gold)] transition-colors"
                  >
                    {[1, 2, 5, 10, 25, 50, 100].map(v => (
                      <option key={v} value={v}>${v}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/50 mb-1 block">大盲</label>
                  <div className="px-3 py-2 rounded-lg bg-black/20 border border-white/5 text-sm text-white/70">
                    ${bigBlind}
                  </div>
                </div>
              </div>

              {/* Buy-in info */}
              <div className="text-xs text-white/30">
                买入范围: ${bigBlind * 20} - ${bigBlind * 100}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/50 bg-white/5
                  hover:bg-white/10 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateTable}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white
                  hover:brightness-110 active:scale-[0.98] transition-all"
                style={{ background: 'var(--action-call)' }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LobbyClient() {
  return (
    <SocketProvider>
      <div className="h-screen flex flex-col bg-[var(--background)]">
        <LobbyView />
      </div>
    </SocketProvider>
  );
}
