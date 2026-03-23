import type { PlayerState, SidePot } from './types';

/**
 * Calculate side pots when one or more players are all-in.
 *
 * Algorithm:
 * 1. Get all unique all-in amounts (totalBetThisHand)
 * 2. Sort ascending
 * 3. For each tier, create a pot from the contributions up to that level
 */
export function calculateSidePots(players: PlayerState[]): SidePot[] {
  // Only consider players who have put money in (not folded before betting or sitting out)
  const bettors = players.filter(
    p => p.totalBetThisHand > 0 && p.status !== 'sitting-out'
  );

  if (bettors.length === 0) return [];

  // Get unique bet levels from all-in players, sorted ascending
  const allInAmounts = [
    ...new Set(
      bettors
        .filter(p => p.status === 'all-in')
        .map(p => p.totalBetThisHand)
    ),
  ].sort((a, b) => a - b);

  // If no one is all-in, there's just one main pot
  if (allInAmounts.length === 0) {
    const total = bettors.reduce((sum, p) => sum + p.totalBetThisHand, 0);
    const eligible = bettors
      .filter(p => p.status !== 'folded')
      .map(p => p.id);
    return [{ amount: total, eligiblePlayerIds: eligible }];
  }

  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const level of allInAmounts) {
    const contribution = level - previousLevel;
    if (contribution <= 0) continue;

    // Everyone who bet at least this level contributes
    const contributors = bettors.filter(p => p.totalBetThisHand >= level);
    const amount = contribution * contributors.length;

    // Eligible to win: contributors who haven't folded
    const eligible = contributors
      .filter(p => p.status !== 'folded')
      .map(p => p.id);

    pots.push({ amount, eligiblePlayerIds: eligible });
    previousLevel = level;
  }

  // Remaining pot above the highest all-in amount
  const maxAllIn = allInAmounts[allInAmounts.length - 1];
  const remainingBettors = bettors.filter(p => p.totalBetThisHand > maxAllIn);
  if (remainingBettors.length > 0) {
    const amount = remainingBettors.reduce(
      (sum, p) => sum + (p.totalBetThisHand - maxAllIn),
      0
    );
    const eligible = remainingBettors
      .filter(p => p.status !== 'folded')
      .map(p => p.id);
    pots.push({ amount, eligiblePlayerIds: eligible });
  }

  return pots;
}

/**
 * Get the total pot amount from all side pots.
 */
export function getTotalPot(sidePots: SidePot[]): number {
  return sidePots.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Get valid actions for a player given the current game state.
 */
export function getValidActions(
  player: PlayerState,
  currentBet: number,
  minRaise: number,
): { canCheck: boolean; canCall: boolean; callAmount: number; canRaise: boolean; minRaiseAmount: number; canAllIn: boolean } {
  const toCall = currentBet - player.currentBet;

  const canCheck = toCall === 0;
  const canCall = toCall > 0 && player.stack > 0;
  const callAmount = Math.min(toCall, player.stack);
  const canRaise = player.stack > toCall;
  const minRaiseAmount = Math.min(currentBet + minRaise, player.stack + player.currentBet);
  const canAllIn = player.stack > 0;

  return { canCheck, canCall, callAmount, canRaise, minRaiseAmount, canAllIn };
}
