// ===== Card Types =====
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = { rank: Rank; suit: Suit };

export type GameMode = 'regular' | 'short-deck';

// ===== Hand Evaluation =====
export type HandRankName =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'one-pair'
  | 'high-card';

export type HandResult = {
  rank: HandRankName;
  score: number; // Higher is better; encodes rank + kickers for comparison
  bestFive: Card[];
  description: string;
};

// ===== Game State =====
export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'sitting-out';

export interface PlayerState {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  holeCards: [Card, Card] | null;
  currentBet: number;
  totalBetThisHand: number;
  status: PlayerStatus;
  isConnected: boolean;
  hasActed: boolean;
  isReady: boolean;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface GameState {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  lastRaiseAmount: number;
  currentBet: number;
  deck: Card[];
  handNumber: number;
}

// ===== Table Config =====
export interface TableConfig {
  id: string;
  name: string;
  mode: GameMode;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
}

// ===== Client-safe state (no deck, no other players' hole cards) =====
export interface ClientPlayerState extends Omit<PlayerState, 'holeCards'> {
  holeCards: [Card, Card] | null; // null for other players unless showdown
  isCurrentPlayer: boolean;
}

export interface ClientGameState {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  players: ClientPlayerState[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  currentBet: number;
  handNumber: number;
  validActions: PlayerAction[];
}

// ===== Winner =====
export interface WinnerResult {
  playerId: string;
  amount: number;
  hand: HandResult | null;
  potIndex: number; // 0 = main pot, 1+ = side pots
}

// ===== Socket Events =====
export interface TableActionPayload {
  action: PlayerAction;
  amount?: number;
}

export interface CreateTablePayload {
  name: string;
  mode: GameMode;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
}

export interface JoinTablePayload {
  tableId: string;
  seatIndex: number;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface TableInfo {
  id: string;
  name: string;
  mode: GameMode;
  maxPlayers: number;
  playerCount: number;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  status: 'waiting' | 'playing';
}
