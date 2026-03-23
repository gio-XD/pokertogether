import { describe, it, expect } from 'vitest';
import {
  createGameState,
  addPlayer,
  canStartHand,
  startNewHand,
  processAction,
  determineWinners,
  applyWinnings,
} from '../game';
import { calculateSidePots } from '../betting';
import type { PlayerState } from '../types';

describe('Game State Machine', () => {
  function setupTwoPlayerGame() {
    let state = createGameState('test-1', 'regular', 5, 10);
    state = addPlayer(state, 'p1', 'Alice', 0, 1000);
    state = addPlayer(state, 'p2', 'Bob', 1, 1000);
    return state;
  }

  it('creates initial game state', () => {
    const state = createGameState('t1', 'regular', 5, 10);
    expect(state.phase).toBe('waiting');
    expect(state.players).toHaveLength(0);
  });

  it('adds players', () => {
    let state = createGameState('t1', 'regular', 5, 10);
    state = addPlayer(state, 'p1', 'Alice', 0, 1000);
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe('Alice');
    expect(state.players[0].stack).toBe(1000);
  });

  it('prevents duplicate seat', () => {
    let state = createGameState('t1', 'regular', 5, 10);
    state = addPlayer(state, 'p1', 'Alice', 0, 1000);
    expect(() => addPlayer(state, 'p2', 'Bob', 0, 1000)).toThrow('occupied');
  });

  it('detects when game can start', () => {
    let state = createGameState('t1', 'regular', 5, 10);
    expect(canStartHand(state)).toBe(false);
    state = addPlayer(state, 'p1', 'Alice', 0, 1000);
    expect(canStartHand(state)).toBe(false);
    state = addPlayer(state, 'p2', 'Bob', 1, 1000);
    expect(canStartHand(state)).toBe(true);
  });

  it('starts a new hand with blinds posted', () => {
    const state = setupTwoPlayerGame();
    const newState = startNewHand(state);

    expect(newState.phase).toBe('pre-flop');
    expect(newState.handNumber).toBe(1);
    expect(newState.communityCards).toHaveLength(0);
    expect(newState.pot).toBe(15); // SB(5) + BB(10)

    // Each player has hole cards
    for (const p of newState.players) {
      expect(p.holeCards).not.toBeNull();
      expect(p.holeCards).toHaveLength(2);
    }
  });

  it('processes fold action', () => {
    const state = setupTwoPlayerGame();
    let gameState = startNewHand(state);

    // In heads-up, dealer is SB, other is BB
    // UTG (first to act pre-flop) is after BB
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, currentPlayer.id, 'fold');

    expect(gameState.phase).toBe('showdown');
  });

  it('processes call and check to move to flop', () => {
    const state = setupTwoPlayerGame();
    let gameState = startNewHand(state);

    // Pre-flop: first player calls
    let current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'call');

    // BB checks
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    expect(gameState.phase).toBe('flop');
    expect(gameState.communityCards).toHaveLength(3);
  });

  it('processes full hand through to showdown', () => {
    const state = setupTwoPlayerGame();
    let gameState = startNewHand(state);

    // Pre-flop: call, check
    let current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'call');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    // Flop: check, check
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    expect(gameState.phase).toBe('turn');
    expect(gameState.communityCards).toHaveLength(4);

    // Turn: check, check
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    expect(gameState.phase).toBe('river');
    expect(gameState.communityCards).toHaveLength(5);

    // River: check, check
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    expect(gameState.phase).toBe('showdown');
  });

  it('processes raise correctly', () => {
    const state = setupTwoPlayerGame();
    let gameState = startNewHand(state);

    // Pre-flop: raise to 30
    let current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'raise', 30);

    expect(gameState.currentBet).toBe(30);
    expect(gameState.pot).toBeGreaterThan(15);
  });

  it('determines winner at showdown', () => {
    const state = setupTwoPlayerGame();
    let gameState = startNewHand(state);

    // Play through to showdown with all checks/calls
    let current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'call');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    // Flop
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    // Turn
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    // River
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');
    current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'check');

    expect(gameState.phase).toBe('showdown');

    const winners = determineWinners(gameState);
    expect(winners.length).toBeGreaterThan(0);

    const totalWon = winners.reduce((s, w) => s + w.amount, 0);
    expect(totalWon).toBe(gameState.pot);
  });

  it('handles all-in correctly', () => {
    let state = createGameState('test-allin', 'regular', 5, 10);
    state = addPlayer(state, 'p1', 'Alice', 0, 100);
    state = addPlayer(state, 'p2', 'Bob', 1, 1000);
    let gameState = startNewHand(state);

    // Player goes all-in
    let current = gameState.players[gameState.currentPlayerIndex];
    gameState = processAction(gameState, current.id, 'all-in');

    const allInPlayer = gameState.players.find(p => p.status === 'all-in');
    expect(allInPlayer).toBeDefined();
    expect(allInPlayer!.stack).toBe(0);
  });
});

describe('Side Pots', () => {
  it('creates single pot when no all-in', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'A', seatIndex: 0, stack: 900, holeCards: null, currentBet: 0, totalBetThisHand: 100, status: 'active', isConnected: true, hasActed: true },
      { id: 'p2', name: 'B', seatIndex: 1, stack: 900, holeCards: null, currentBet: 0, totalBetThisHand: 100, status: 'active', isConnected: true, hasActed: true },
    ];

    const pots = calculateSidePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(200);
    expect(pots[0].eligiblePlayerIds).toContain('p1');
    expect(pots[0].eligiblePlayerIds).toContain('p2');
  });

  it('creates side pot with all-in player', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'A', seatIndex: 0, stack: 0, holeCards: null, currentBet: 0, totalBetThisHand: 50, status: 'all-in', isConnected: true, hasActed: true },
      { id: 'p2', name: 'B', seatIndex: 1, stack: 850, holeCards: null, currentBet: 0, totalBetThisHand: 100, status: 'active', isConnected: true, hasActed: true },
      { id: 'p3', name: 'C', seatIndex: 2, stack: 850, holeCards: null, currentBet: 0, totalBetThisHand: 100, status: 'active', isConnected: true, hasActed: true },
    ];

    const pots = calculateSidePots(players);
    expect(pots).toHaveLength(2);

    // Main pot: 50 * 3 = 150 (all three eligible)
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligiblePlayerIds).toHaveLength(3);

    // Side pot: 50 * 2 = 100 (only p2 and p3)
    expect(pots[1].amount).toBe(100);
    expect(pots[1].eligiblePlayerIds).toHaveLength(2);
    expect(pots[1].eligiblePlayerIds).not.toContain('p1');
  });

  it('handles folded player in side pot correctly', () => {
    const players: PlayerState[] = [
      { id: 'p1', name: 'A', seatIndex: 0, stack: 0, holeCards: null, currentBet: 0, totalBetThisHand: 50, status: 'all-in', isConnected: true, hasActed: true },
      { id: 'p2', name: 'B', seatIndex: 1, stack: 850, holeCards: null, currentBet: 0, totalBetThisHand: 100, status: 'folded', isConnected: true, hasActed: true },
      { id: 'p3', name: 'C', seatIndex: 2, stack: 850, holeCards: null, currentBet: 0, totalBetThisHand: 100, status: 'active', isConnected: true, hasActed: true },
    ];

    const pots = calculateSidePots(players);
    // Main pot: 50*3=150, only p1 and p3 eligible (p2 folded)
    expect(pots[0].eligiblePlayerIds).not.toContain('p2');
  });
});
