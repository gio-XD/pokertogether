import type { Rank, Suit, HandRankName } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const RANKS_REGULAR: Rank[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A',
];

export const RANKS_SHORT_DECK: Rank[] = [
  '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A',
];

// Numeric value of each rank for comparison
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

// Regular Texas Hold'em hand rankings (higher number = better hand)
export const HAND_RANK_VALUES_REGULAR: Record<HandRankName, number> = {
  'high-card': 1,
  'one-pair': 2,
  'two-pair': 3,
  'three-of-a-kind': 4,
  'straight': 5,
  'flush': 6,
  'full-house': 7,
  'four-of-a-kind': 8,
  'straight-flush': 9,
  'royal-flush': 10,
};

// Short Deck hand rankings: flush > full house, three-of-a-kind > straight
export const HAND_RANK_VALUES_SHORT_DECK: Record<HandRankName, number> = {
  'high-card': 1,
  'one-pair': 2,
  'two-pair': 3,
  'straight': 4,
  'three-of-a-kind': 5,
  'full-house': 6,
  'flush': 7,
  'four-of-a-kind': 8,
  'straight-flush': 9,
  'royal-flush': 10,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

export const ACTION_TIMEOUT_MS = 30_000;
export const MIN_PLAYERS_TO_START = 2;
export const MAX_PLAYERS = 9;

/** How long to display showdown results before starting the next hand (ms) */
export const SHOWDOWN_DISPLAY_MS = 4_000;

/** Remove tables with no connected players after this duration (ms) — 30 minutes */
export const EMPTY_TABLE_TIMEOUT_MS = 30 * 60 * 1000;
