import type { Card, GameMode, HandRankName, HandResult, Rank } from './types';
import {
  RANK_VALUES,
  HAND_RANK_VALUES_REGULAR,
  HAND_RANK_VALUES_SHORT_DECK,
  SUIT_SYMBOLS,
  RANK_DISPLAY,
} from './constants';

// ===== Helpers =====

function rankVal(r: Rank): number {
  return RANK_VALUES[r];
}

function sortByRankDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => rankVal(b.rank) - rankVal(a.rank));
}

/** Get all C(n, k) combinations */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  const [first, ...rest] = arr;
  // Combinations that include `first`
  for (const combo of combinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }
  // Combinations that exclude `first`
  for (const combo of combinations(rest, k)) {
    result.push(combo);
  }
  return result;
}

function countByRank(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const c of cards) {
    counts.set(c.rank, (counts.get(c.rank) || 0) + 1);
  }
  return counts;
}

function cardStr(c: Card): string {
  return `${RANK_DISPLAY[c.rank]}${SUIT_SYMBOLS[c.suit]}`;
}

function handStr(cards: Card[]): string {
  return cards.map(cardStr).join(' ');
}

// ===== 5-Card Hand Evaluation =====

interface FiveCardResult {
  rank: HandRankName;
  /** Primary score bits (kickers encoded) — used with hand rank for total score */
  kickers: number[];
  cards: Card[];
}

function isFlush(cards: Card[]): boolean {
  return cards.every(c => c.suit === cards[0].suit);
}

function isStraight(cards: Card[], mode: GameMode): { is: boolean; highCard: number } {
  const sorted = sortByRankDesc(cards);
  const values = sorted.map(c => rankVal(c.rank));

  // Check normal straight
  let straight = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      straight = false;
      break;
    }
  }
  if (straight) return { is: true, highCard: values[0] };

  // Check wheel (A-2-3-4-5) for regular mode
  if (mode === 'regular') {
    const wheel = [14, 5, 4, 3, 2];
    if (values.every((v, i) => v === wheel[i])) {
      return { is: true, highCard: 5 }; // 5-high straight
    }
  }

  // Check A-6-7-8-9 for short deck mode (A is low)
  if (mode === 'short-deck') {
    const lowStraight = [14, 9, 8, 7, 6];
    if (values.every((v, i) => v === lowStraight[i])) {
      return { is: true, highCard: 9 }; // 9-high straight
    }
  }

  return { is: false, highCard: 0 };
}

function evaluate5Cards(cards: Card[], mode: GameMode): FiveCardResult {
  const sorted = sortByRankDesc(cards);
  const flush = isFlush(sorted);
  const straight = isStraight(sorted, mode);
  const counts = countByRank(sorted);

  // Group by count for ranking
  const groups: { rank: Rank; count: number }[] = [];
  for (const [rank, count] of counts) {
    groups.push({ rank, count });
  }
  // Sort: by count desc, then by rank value desc
  groups.sort((a, b) => b.count - a.count || rankVal(b.rank) - rankVal(a.rank));

  // Straight flush / Royal flush
  if (flush && straight.is) {
    if (straight.highCard === 14) {
      return { rank: 'royal-flush', kickers: [14], cards: sorted };
    }
    return { rank: 'straight-flush', kickers: [straight.highCard], cards: sorted };
  }

  // Four of a kind
  if (groups[0].count === 4) {
    const quadRank = rankVal(groups[0].rank);
    const kicker = rankVal(groups[1].rank);
    return { rank: 'four-of-a-kind', kickers: [quadRank, kicker], cards: sorted };
  }

  // Full house
  if (groups[0].count === 3 && groups[1].count === 2) {
    return {
      rank: 'full-house',
      kickers: [rankVal(groups[0].rank), rankVal(groups[1].rank)],
      cards: sorted,
    };
  }

  // Flush
  if (flush) {
    const kickers = sorted.map(c => rankVal(c.rank));
    return { rank: 'flush', kickers, cards: sorted };
  }

  // Straight
  if (straight.is) {
    return { rank: 'straight', kickers: [straight.highCard], cards: sorted };
  }

  // Three of a kind
  if (groups[0].count === 3) {
    const tripRank = rankVal(groups[0].rank);
    const kickers = groups.slice(1).map(g => rankVal(g.rank));
    return { rank: 'three-of-a-kind', kickers: [tripRank, ...kickers], cards: sorted };
  }

  // Two pair
  if (groups[0].count === 2 && groups[1].count === 2) {
    const highPair = Math.max(rankVal(groups[0].rank), rankVal(groups[1].rank));
    const lowPair = Math.min(rankVal(groups[0].rank), rankVal(groups[1].rank));
    const kicker = rankVal(groups[2].rank);
    return { rank: 'two-pair', kickers: [highPair, lowPair, kicker], cards: sorted };
  }

  // One pair
  if (groups[0].count === 2) {
    const pairRank = rankVal(groups[0].rank);
    const kickers = groups.slice(1).map(g => rankVal(g.rank));
    return { rank: 'one-pair', kickers: [pairRank, ...kickers], cards: sorted };
  }

  // High card
  const kickers = sorted.map(c => rankVal(c.rank));
  return { rank: 'high-card', kickers, cards: sorted };
}

// ===== Score Encoding =====
// Score = handRankValue * 15^5 + kicker[0]*15^4 + kicker[1]*15^3 + ...
// This ensures any higher hand rank always beats any lower hand rank

function encodeScore(handRankValue: number, kickers: number[]): number {
  let score = handRankValue * Math.pow(15, 5);
  for (let i = 0; i < 5; i++) {
    score += (kickers[i] || 0) * Math.pow(15, 4 - i);
  }
  return score;
}

function getHandRankValues(mode: GameMode): Record<HandRankName, number> {
  return mode === 'short-deck' ? HAND_RANK_VALUES_SHORT_DECK : HAND_RANK_VALUES_REGULAR;
}

function describeHand(rank: HandRankName, cards: Card[]): string {
  const labels: Record<HandRankName, string> = {
    'royal-flush': '皇家同花顺',
    'straight-flush': '同花顺',
    'four-of-a-kind': '四条',
    'full-house': '葫芦',
    'flush': '同花',
    'straight': '顺子',
    'three-of-a-kind': '三条',
    'two-pair': '两对',
    'one-pair': '一对',
    'high-card': '高牌',
  };
  return `${labels[rank]} (${handStr(cards)})`;
}

// ===== Public API =====

/**
 * Evaluate the best 5-card hand from up to 7 cards.
 * Works for both regular and short-deck Texas Hold'em.
 */
export function evaluateHand(cards: Card[], mode: GameMode): HandResult {
  if (cards.length < 5) {
    throw new Error(`Need at least 5 cards, got ${cards.length}`);
  }

  const rankValues = getHandRankValues(mode);
  let bestResult: FiveCardResult | null = null;
  let bestScore = -1;

  const combos = cards.length === 5 ? [cards] : combinations(cards, 5);

  for (const combo of combos) {
    const result = evaluate5Cards(combo, mode);
    const score = encodeScore(rankValues[result.rank], result.kickers);
    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return {
    rank: bestResult!.rank,
    score: bestScore,
    bestFive: bestResult!.cards,
    description: describeHand(bestResult!.rank, bestResult!.cards),
  };
}

/**
 * Compare two hand results. Returns:
 *  > 0 if a wins
 *  < 0 if b wins
 *  0 if tie
 */
export function compareHands(a: HandResult, b: HandResult): number {
  return a.score - b.score;
}
