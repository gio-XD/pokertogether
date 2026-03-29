import type { GameMode, GameState, PlayerAction, TableConfig, WinnerResult } from './types';
import {
  createGameState,
  addPlayer,
  removePlayer,
  canStartHand,
  startNewHand,
  processAction,
  determineWinners,
  applyWinnings,
  resetAfterShowdown,
  sanitizeStateForPlayer,
} from './game';
import { ACTION_TIMEOUT_MS, SHOWDOWN_DISPLAY_MS } from './constants';

export type TableEventType =
  | 'state-update'
  | 'hand-started'
  | 'action-processed'
  | 'phase-changed'
  | 'showdown'
  | 'hand-complete'
  | 'player-joined'
  | 'player-left'
  | 'turn-timeout';

export interface TableEvent {
  type: TableEventType;
  state: GameState;
  data?: unknown;
}

export class Table {
  config: TableConfig;
  state: GameState;
  /** Remember stacks of players who left so they can resume with the same chips */
  private previousStacks = new Map<string, number>();
  private actionTimer: ReturnType<typeof setTimeout> | null = null;
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null;
  private showdownTimer: ReturnType<typeof setTimeout> | null = null;
  private eventListeners: ((event: TableEvent) => void)[] = [];

  constructor(config: TableConfig) {
    this.config = config;
    this.state = createGameState(config.id, config.mode, config.smallBlind, config.bigBlind);
  }

  on(listener: (event: TableEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }

  private emit(event: TableEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  // === Player Management ===

  joinTable(playerId: string, name: string, seatIndex: number): void {
    if (seatIndex < 0 || seatIndex >= this.config.maxPlayers) {
      throw new Error(`Invalid seat index: ${seatIndex}`);
    }

    // Restore previous stack if the player was here before, otherwise use table buy-in
    const buyIn = this.previousStacks.get(playerId) ?? this.config.buyIn;
    this.previousStacks.delete(playerId);

    this.state = addPlayer(this.state, playerId, name, seatIndex, buyIn);

    // New players joining mid-hand must wait for the next hand
    if (this.state.phase !== 'waiting') {
      const player = this.state.players.find(p => p.id === playerId);
      if (player) {
        player.status = 'sitting-out';
      }
    }

    this.emit({ type: 'player-joined', state: this.state, data: { playerId, seatIndex } });

    // Auto-start if enough players
    this.tryAutoStart();
  }

  rebuy(playerId: string, amount: number): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not at table');

    // Cannot rebuy while actively in a hand
    if (this.state.phase !== 'waiting' && player.status !== 'sitting-out') {
      throw new Error('只能在等待阶段或坐下时买入');
    }

    const bb = this.state.bigBlind;
    // Must be a positive whole number of big blinds
    if (amount <= 0 || amount % bb !== 0) {
      throw new Error(`买入必须是大盲 (${bb}) 的整数倍`);
    }

    // Max = chip leader's stack (excluding self), rounded down to whole BBs
    const othersMax = Math.max(...this.state.players.filter(p => p.id !== playerId).map(p => p.stack), 0);
    const chipLeaderStack = Math.max(othersMax, player.stack);
    const maxRebuy = Math.floor(chipLeaderStack / bb) * bb;
    // If everyone is busted / solo, fall back to table buy-in
    const effectiveMax = maxRebuy > 0 ? maxRebuy : this.config.buyIn;

    // The rebuy amount is the TOP-UP target, so cap at effectiveMax - current stack
    const maxTopUp = Math.floor((effectiveMax - player.stack) / bb) * bb;
    if (maxTopUp <= 0) {
      throw new Error('筹码已达上限');
    }

    if (amount > maxTopUp) {
      throw new Error(`买入不能超过 ${maxTopUp}`);
    }

    player.pendingRebuy = amount;
    player.isReady = true;
    this.emit({ type: 'state-update', state: this.state });
    this.tryAutoStart();
  }

  toggleReady(playerId: string): void {
    if (this.state.phase !== 'waiting') return;
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;
    player.isReady = !player.isReady;
    this.emit({ type: 'state-update', state: this.state });
    this.tryAutoStart();
  }

  leaveTable(playerId: string): void {
    // Remember the player's stack so they can resume later
    const leaving = this.state.players.find(p => p.id === playerId);
    if (leaving && leaving.stack > 0) {
      this.previousStacks.set(playerId, leaving.stack);
    }

    // If hand is in progress and player is in it, fold them
    if (this.state.phase !== 'waiting') {
      const playerIndex = this.state.players.findIndex(p => p.id === playerId);
      if (playerIndex >= 0 && this.state.players[playerIndex].status === 'active') {
        if (this.state.currentPlayerIndex === playerIndex) {
          this.handleAction(playerId, 'fold');
        } else {
          const players = this.state.players.map(p => ({ ...p }));
          players[playerIndex].status = 'folded';
          this.state = { ...this.state, players };
        }
      }
    }

    this.state = removePlayer(this.state, playerId);
    this.emit({ type: 'player-left', state: this.state, data: { playerId } });
  }

  // === Game Actions ===

  handleAction(playerId: string, action: PlayerAction, amount?: number): void {
    this.clearActionTimer();

    const prevPhase = this.state.phase;
    this.state = processAction(this.state, playerId, action, amount);

    this.emit({ type: 'action-processed', state: this.state, data: { playerId, action, amount } });

    if (this.state.phase !== prevPhase) {
      this.emit({ type: 'phase-changed', state: this.state });
    }

    if (this.state.phase === 'showdown') {
      this.handleShowdown();
      return;
    }

    // Start timer for next player
    if (this.state.currentPlayerIndex >= 0) {
      this.startActionTimer();
    }
  }

  private handleShowdown(): void {
    const winners = determineWinners(this.state);
    this.emit({ type: 'showdown', state: this.state, data: { winners } });

    // Apply winnings but keep phase as 'showdown' so clients can see cards
    this.state = applyWinnings(this.state, winners);
    this.emit({ type: 'hand-complete', state: this.state, data: { winners } });

    // After display period, reset to waiting and start next hand.
    // Use a dedicated timer so tryAutoStart() cannot accidentally clear it.
    this.clearShowdownTimer();
    this.showdownTimer = setTimeout(() => {
      this.showdownTimer = null;
      this.state = resetAfterShowdown(this.state);
      this.emit({ type: 'state-update', state: this.state });
      this.tryAutoStart();
    }, SHOWDOWN_DISPLAY_MS);
  }

  // === Timers ===

  private tryAutoStart(): void {
    this.clearAutoStartTimer();
    if (this.state.phase === 'waiting' && canStartHand(this.state)) {
      this.autoStartTimer = setTimeout(() => {
        if (canStartHand(this.state)) {
          this.startHand();
        }
      }, 3000); // 3 second delay before starting
    }
  }

  private startHand(): void {
    this.state = startNewHand(this.state);
    this.emit({ type: 'hand-started', state: this.state });

    if (this.state.currentPlayerIndex >= 0) {
      this.startActionTimer();
    }
  }

  private startActionTimer(): void {
    this.clearActionTimer();
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer) return;

    this.actionTimer = setTimeout(() => {
      // Auto-fold on timeout
      if (this.state.currentPlayerIndex >= 0) {
        const player = this.state.players[this.state.currentPlayerIndex];
        if (player && player.status === 'active') {
          this.emit({ type: 'turn-timeout', state: this.state, data: { playerId: player.id } });
          this.handleAction(player.id, 'fold');
        }
      }
    }, ACTION_TIMEOUT_MS);
  }

  private clearActionTimer(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
  }

  private clearAutoStartTimer(): void {
    if (this.autoStartTimer) {
      clearTimeout(this.autoStartTimer);
      this.autoStartTimer = null;
    }
  }

  private clearShowdownTimer(): void {
    if (this.showdownTimer) {
      clearTimeout(this.showdownTimer);
      this.showdownTimer = null;
    }
  }

  // === State Access ===

  getStateForPlayer(playerId: string) {
    return sanitizeStateForPlayer(this.state, playerId);
  }

  getTableInfo() {
    return {
      id: this.config.id,
      name: this.config.name,
      mode: this.config.mode,
      maxPlayers: this.config.maxPlayers,
      playerCount: this.state.players.length,
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind,
      buyIn: this.config.buyIn,
      status: this.state.phase === 'waiting' ? 'waiting' as const : 'playing' as const,
    };
  }

  destroy(): void {
    this.clearActionTimer();
    this.clearAutoStartTimer();
    this.clearShowdownTimer();
    this.eventListeners = [];
  }
}
