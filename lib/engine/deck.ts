import type { Card, GameMode } from './types';
import { SUITS, RANKS_REGULAR, RANKS_SHORT_DECK } from './constants';

export function createDeck(mode: GameMode): Card[] {
  const ranks = mode === 'short-deck' ? RANKS_SHORT_DECK : RANKS_REGULAR;
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle (in-place, returns the same array) */
export function shuffle(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Deal `count` cards from the top of the deck. Mutates the deck. */
export function deal(deck: Card[], count: number): Card[] {
  if (deck.length < count) {
    throw new Error(`Cannot deal ${count} cards from deck of ${deck.length}`);
  }
  return deck.splice(0, count);
}

export function createShuffledDeck(mode: GameMode): Card[] {
  return shuffle(createDeck(mode));
}
