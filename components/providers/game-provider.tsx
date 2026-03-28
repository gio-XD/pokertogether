'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ClientGameState, WinnerResult } from '@/lib/engine/types';
import { useSocket } from './socket-provider';

interface GameContextValue {
  gameState: ClientGameState | null;
  winners: WinnerResult[] | null;
  showdown: boolean;
  error: string | null;
  sendAction: (action: string, amount?: number) => void;
  sendChat: (message: string) => void;
}

const GameContext = createContext<GameContextValue>({
  gameState: null,
  winners: null,
  showdown: false,
  error: null,
  sendAction: () => {},
  sendChat: () => {},
});

type GameAction =
  | { type: 'SET_STATE'; payload: ClientGameState }
  | { type: 'SET_WINNERS'; payload: WinnerResult[] }
  | { type: 'CLEAR_SHOWDOWN' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

interface GameReducerState {
  gameState: ClientGameState | null;
  winners: WinnerResult[] | null;
  showdown: boolean;
  error: string | null;
}

function gameReducer(state: GameReducerState, action: GameAction): GameReducerState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, gameState: action.payload, error: null };
    case 'SET_WINNERS':
      return { ...state, winners: action.payload, showdown: true };
    case 'CLEAR_SHOWDOWN':
      return { ...state, winners: null, showdown: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(gameReducer, {
    gameState: null,
    winners: null,
    showdown: false,
    error: null,
  });

  useEffect(() => {
    if (!socket) return;

    const onState = (data: ClientGameState) => {
      dispatch({ type: 'SET_STATE', payload: data });
    };

    const onShowdown = (data: { winners: WinnerResult[] }) => {
      dispatch({ type: 'SET_WINNERS', payload: data.winners });
    };

    const onHandComplete = () => {
      setTimeout(() => dispatch({ type: 'CLEAR_SHOWDOWN' }), 4000);
    };

    const onError = (data: { message: string }) => {
      dispatch({ type: 'SET_ERROR', payload: data.message });
      setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 3000);
    };

    socket.on('table:state', onState);
    socket.on('table:showdown', onShowdown);
    socket.on('table:hand-complete', onHandComplete);
    socket.on('table:error', onError);

    return () => {
      socket.off('table:state', onState);
      socket.off('table:showdown', onShowdown);
      socket.off('table:hand-complete', onHandComplete);
      socket.off('table:error', onError);
    };
  }, [socket]);

  const sendAction = useCallback((action: string, amount?: number) => {
    socket?.emit('table:action', { action, amount });
  }, [socket]);

  const sendChat = useCallback((message: string) => {
    socket?.emit('table:chat', message);
  }, [socket]);

  return (
    <GameContext.Provider value={{
      gameState: state.gameState,
      winners: state.winners,
      showdown: state.showdown,
      error: state.error,
      sendAction,
      sendChat,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
