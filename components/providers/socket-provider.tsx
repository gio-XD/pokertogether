'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY_NAME = 'poker_player_name';
const STORAGE_KEY_ID = 'poker_player_id';

function getSavedName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_NAME);
}

function saveName(name: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_NAME, name);
  }
}

function savePlayerId(id: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ID, id);
  }
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  playerId: string | null;
  playerName: string | null;
  setPlayerName: (name: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  playerId: null,
  playerName: null,
  setPlayerName: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState<string | null>(null);

  useEffect(() => {
    const s = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Restore saved name on reconnect
      const saved = getSavedName();
      if (saved) {
        s.emit('auth:set-name', saved);
        setPlayerNameState(saved);
      }
    });

    s.on('disconnect', () => setIsConnected(false));

    s.on('auth:session', (data: { playerId: string; playerName: string }) => {
      setPlayerId(data.playerId);
      savePlayerId(data.playerId);
      // If we have a saved name, keep using it; otherwise use server-assigned
      const saved = getSavedName();
      if (saved) {
        setPlayerNameState(saved);
      } else {
        setPlayerNameState(data.playerName);
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const setPlayerName = (name: string) => {
    socket?.emit('auth:set-name', name);
    setPlayerNameState(name);
    saveName(name);
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, playerId, playerName, setPlayerName }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
