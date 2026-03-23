import type {
  Card,
  GameMode,
  GamePhase,
  GameState,
  PlayerAction,
  PlayerState,
  WinnerResult,
  ClientGameState,
  ClientPlayerState,
} from './types';
import { createShuffledDeck, deal } from './deck';
import { evaluateHand, compareHands } from './hand-evaluator';
import { calculateSidePots, getValidActions } from './betting';
import { MIN_PLAYERS_TO_START } from './constants';

// ===== Game Creation =====

export function createGameState(
  id: string,
  mode: GameMode,
  smallBlind: number,
  bigBlind: number,
): GameState {
  return {
    id,
    mode,
    phase: 'waiting',
    players: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentPlayerIndex: -1,
    dealerIndex: 0,
    smallBlind,
    bigBlind,
    minRaise: bigBlind,
    lastRaiseAmount: bigBlind,
    currentBet: 0,
    deck: [],
    handNumber: 0,
  };
}

// ===== Player Management =====

export function addPlayer(
  state: GameState,
  id: string,
  name: string,
  seatIndex: number,
  buyIn: number,
): GameState {
  if (state.players.find(p => p.seatIndex === seatIndex)) {
    throw new Error(`Seat ${seatIndex} is occupied`);
  }
  if (state.players.find(p => p.id === id)) {
    throw new Error(`Player ${id} already at table`);
  }

  const player: PlayerState = {
    id,
    name,
    seatIndex,
    stack: buyIn,
    holeCards: null,
    currentBet: 0,
    totalBetThisHand: 0,
    status: 'active',
    isConnected: true,
    hasActed: false,
  };

  return { ...state, players: [...state.players, player].sort((a, b) => a.seatIndex - b.seatIndex) };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  return { ...state, players: state.players.filter(p => p.id !== playerId) };
}

// ===== Hand Management =====

function getActivePlayers(state: GameState): PlayerState[] {
  return state.players.filter(
    p => p.status !== 'sitting-out' && p.stack > 0
  );
}

function getPlayersInHand(state: GameState): PlayerState[] {
  return state.players.filter(
    p => p.status === 'active' || p.status === 'all-in'
  );
}

function getActivePlayersNotAllIn(state: GameState): PlayerState[] {
  return state.players.filter(p => p.status === 'active');
}

function nextSeatIndex(state: GameState, fromIndex: number, filter: (p: PlayerState) => boolean): number {
  const players = state.players;
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    if (filter(players[idx])) return idx;
  }
  return -1;
}

export function canStartHand(state: GameState): boolean {
  return getActivePlayers(state).length >= MIN_PLAYERS_TO_START;
}

export function startNewHand(state: GameState): GameState {
  const activePlayers = getActivePlayers(state);
  if (activePlayers.length < MIN_PLAYERS_TO_START) {
    throw new Error('Not enough players to start');
  }

  // Reset players for new hand
  const players: PlayerState[] = state.players.map(p => {
    if (p.status === 'sitting-out' || p.stack <= 0) {
      return { ...p, holeCards: null, currentBet: 0, totalBetThisHand: 0, status: 'sitting-out' as const, hasActed: false };
    }
    return { ...p, holeCards: null, currentBet: 0, totalBetThisHand: 0, status: 'active' as const, hasActed: false };
  });

  // Move dealer button
  const newDealerIndex = state.handNumber === 0
    ? 0
    : nextSeatIndex(
        { ...state, players },
        state.dealerIndex,
        p => p.status !== 'sitting-out'
      );

  const deck = createShuffledDeck(state.mode);

  let newState: GameState = {
    ...state,
    players,
    deck,
    communityCards: [],
    pot: 0,
    sidePots: [],
    phase: 'pre-flop',
    currentBet: 0,
    minRaise: state.bigBlind,
    lastRaiseAmount: state.bigBlind,
    dealerIndex: newDealerIndex,
    handNumber: state.handNumber + 1,
    currentPlayerIndex: -1,
  };

  // Post blinds
  newState = postBlinds(newState);

  // Deal hole cards
  newState = dealHoleCards(newState);

  // Set first player to act (UTG = after big blind)
  const activePlayerIds = newState.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.status === 'active');

  if (activePlayerIds.length > 0) {
    const bbIndex = getBigBlindIndex(newState);
    newState.currentPlayerIndex = nextSeatIndex(
      newState,
      bbIndex,
      p => p.status === 'active'
    );
  }

  return newState;
}

function getSmallBlindIndex(state: GameState): number {
  const activePlayers = state.players.filter(p => p.status !== 'sitting-out');
  if (activePlayers.length === 2) {
    // Heads-up: dealer is small blind
    return state.dealerIndex;
  }
  return nextSeatIndex(state, state.dealerIndex, p => p.status !== 'sitting-out');
}

function getBigBlindIndex(state: GameState): number {
  const sbIndex = getSmallBlindIndex(state);
  return nextSeatIndex(state, sbIndex, p => p.status !== 'sitting-out');
}

function postBlinds(state: GameState): GameState {
  const players = [...state.players.map(p => ({ ...p }))];
  const sbIndex = getSmallBlindIndex(state);
  const bbIndex = getBigBlindIndex(state);

  // Small blind
  const sbAmount = Math.min(state.smallBlind, players[sbIndex].stack);
  players[sbIndex].stack -= sbAmount;
  players[sbIndex].currentBet = sbAmount;
  players[sbIndex].totalBetThisHand = sbAmount;
  if (players[sbIndex].stack === 0) players[sbIndex].status = 'all-in';

  // Big blind
  const bbAmount = Math.min(state.bigBlind, players[bbIndex].stack);
  players[bbIndex].stack -= bbAmount;
  players[bbIndex].currentBet = bbAmount;
  players[bbIndex].totalBetThisHand = bbAmount;
  if (players[bbIndex].stack === 0) players[bbIndex].status = 'all-in';

  const pot = sbAmount + bbAmount;

  return { ...state, players, pot, currentBet: state.bigBlind };
}

function dealHoleCards(state: GameState): GameState {
  const players = [...state.players.map(p => ({ ...p }))];
  const deck = [...state.deck];

  for (const player of players) {
    if (player.status !== 'sitting-out') {
      const cards = deal(deck, 2);
      player.holeCards = [cards[0], cards[1]];
    }
  }

  return { ...state, players, deck };
}

// ===== Action Processing =====

export function processAction(
  state: GameState,
  playerId: string,
  action: PlayerAction,
  amount?: number,
): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not found');
  if (playerIndex !== state.currentPlayerIndex) throw new Error('Not your turn');

  const player = state.players[playerIndex];
  if (player.status !== 'active') throw new Error('Player cannot act');

  const players = state.players.map(p => ({ ...p }));
  const currentPlayer = players[playerIndex];
  let { pot, currentBet, minRaise, lastRaiseAmount } = state;

  switch (action) {
    case 'fold': {
      currentPlayer.status = 'folded';
      currentPlayer.hasActed = true;
      break;
    }

    case 'check': {
      const toCall = currentBet - currentPlayer.currentBet;
      if (toCall > 0) throw new Error('Cannot check, must call or raise');
      currentPlayer.hasActed = true;
      break;
    }

    case 'call': {
      const toCall = Math.min(currentBet - currentPlayer.currentBet, currentPlayer.stack);
      currentPlayer.stack -= toCall;
      currentPlayer.currentBet += toCall;
      currentPlayer.totalBetThisHand += toCall;
      pot += toCall;
      currentPlayer.hasActed = true;
      if (currentPlayer.stack === 0) currentPlayer.status = 'all-in';
      break;
    }

    case 'raise': {
      if (amount === undefined) throw new Error('Raise amount required');
      // amount is the TOTAL bet amount (not the additional raise)
      const totalBet = amount;
      const raiseBy = totalBet - currentBet;

      if (raiseBy < minRaise && totalBet < currentPlayer.stack + currentPlayer.currentBet) {
        throw new Error(`Raise must be at least ${minRaise} more than current bet`);
      }

      const toAdd = totalBet - currentPlayer.currentBet;
      const actualAdd = Math.min(toAdd, currentPlayer.stack);

      currentPlayer.stack -= actualAdd;
      currentPlayer.currentBet += actualAdd;
      currentPlayer.totalBetThisHand += actualAdd;
      pot += actualAdd;

      if (currentPlayer.currentBet > currentBet) {
        lastRaiseAmount = currentPlayer.currentBet - currentBet;
        minRaise = lastRaiseAmount;
        currentBet = currentPlayer.currentBet;
        // Reset hasActed for all other active players (they must act again)
        for (const p of players) {
          if (p.id !== playerId && p.status === 'active') {
            p.hasActed = false;
          }
        }
      }

      currentPlayer.hasActed = true;
      if (currentPlayer.stack === 0) currentPlayer.status = 'all-in';
      break;
    }

    case 'all-in': {
      const allInAmount = currentPlayer.stack;
      const newBet = currentPlayer.currentBet + allInAmount;

      currentPlayer.stack = 0;
      pot += allInAmount;
      currentPlayer.totalBetThisHand += allInAmount;
      currentPlayer.currentBet = newBet;
      currentPlayer.status = 'all-in';
      currentPlayer.hasActed = true;

      if (newBet > currentBet) {
        const raiseAmount = newBet - currentBet;
        if (raiseAmount >= minRaise) {
          lastRaiseAmount = raiseAmount;
          minRaise = raiseAmount;
        }
        currentBet = newBet;
        // Reset hasActed for other active players
        for (const p of players) {
          if (p.id !== playerId && p.status === 'active') {
            p.hasActed = false;
          }
        }
      }
      break;
    }
  }

  let newState: GameState = {
    ...state,
    players,
    pot,
    currentBet,
    minRaise,
    lastRaiseAmount,
  };

  // Check if hand is over (only one player left)
  const playersInHand = getPlayersInHand(newState);
  if (playersInHand.length <= 1) {
    return resolveHand(newState);
  }

  // Check if betting round is complete
  if (isBettingRoundComplete(newState)) {
    return advancePhase(newState);
  }

  // Move to next player
  newState.currentPlayerIndex = nextSeatIndex(
    newState,
    playerIndex,
    p => p.status === 'active' && !p.hasActed
  );

  // If no active player to act found, try any active player
  if (newState.currentPlayerIndex === -1) {
    newState.currentPlayerIndex = nextSeatIndex(
      newState,
      playerIndex,
      p => p.status === 'active'
    );
  }

  return newState;
}

function isBettingRoundComplete(state: GameState): boolean {
  const activePlayers = getActivePlayersNotAllIn(state);

  // All active (non-all-in) players have acted and matched the current bet
  return activePlayers.every(
    p => p.hasActed && p.currentBet === state.currentBet
  );
}

// ===== Phase Advancement =====

function advancePhase(state: GameState): GameState {
  const playersInHand = getPlayersInHand(state);

  // If only one player can still act, run out remaining cards
  const activeNotAllIn = getActivePlayersNotAllIn(state);
  const shouldRunOut = activeNotAllIn.length <= 1 && playersInHand.length > 1;

  let newState = resetBettingRound(state);

  const phaseOrder: GamePhase[] = ['pre-flop', 'flop', 'turn', 'river', 'showdown'];
  const currentPhaseIndex = phaseOrder.indexOf(newState.phase);
  const nextPhase = phaseOrder[currentPhaseIndex + 1];

  if (!nextPhase || nextPhase === 'showdown') {
    return resolveHand(newState);
  }

  newState.phase = nextPhase;
  const deck = [...newState.deck];
  const communityCards = [...newState.communityCards];

  switch (nextPhase) {
    case 'flop': {
      deal(deck, 1); // burn
      communityCards.push(...deal(deck, 3));
      break;
    }
    case 'turn': {
      deal(deck, 1); // burn
      communityCards.push(...deal(deck, 1));
      break;
    }
    case 'river': {
      deal(deck, 1); // burn
      communityCards.push(...deal(deck, 1));
      break;
    }
  }

  newState = { ...newState, deck, communityCards };

  // If we should run out (all players all-in), skip to next phase
  if (shouldRunOut) {
    return advancePhase(newState);
  }

  // Set first player to act (first active player after dealer)
  newState.currentPlayerIndex = nextSeatIndex(
    newState,
    newState.dealerIndex,
    p => p.status === 'active'
  );

  return newState;
}

function resetBettingRound(state: GameState): GameState {
  const players = state.players.map(p => ({
    ...p,
    currentBet: 0,
    hasActed: false,
  }));

  return {
    ...state,
    players,
    currentBet: 0,
    minRaise: state.bigBlind,
    lastRaiseAmount: state.bigBlind,
  };
}

// ===== Hand Resolution =====

function resolveHand(state: GameState): GameState {
  const newState = { ...state, phase: 'showdown' as GamePhase, currentPlayerIndex: -1 };
  return newState;
}

export function determineWinners(state: GameState): WinnerResult[] {
  const playersInHand = getPlayersInHand(state);

  // Single player remaining — wins entire pot
  if (playersInHand.length === 1) {
    return [{
      playerId: playersInHand[0].id,
      amount: state.pot,
      hand: null,
      potIndex: 0,
    }];
  }

  // Calculate side pots
  const sidePots = calculateSidePots(state.players);
  const results: WinnerResult[] = [];

  for (let potIndex = 0; potIndex < sidePots.length; potIndex++) {
    const pot = sidePots[potIndex];
    const eligible = pot.eligiblePlayerIds;

    // Evaluate hands for eligible players
    const hands = eligible.map(pid => {
      const player = state.players.find(p => p.id === pid)!;
      const allCards = [...(player.holeCards || []), ...state.communityCards];
      if (allCards.length < 5) {
        return { playerId: pid, hand: null };
      }
      return {
        playerId: pid,
        hand: evaluateHand(allCards, state.mode),
      };
    }).filter(h => h.hand !== null) as { playerId: string; hand: NonNullable<ReturnType<typeof evaluateHand>> }[];

    if (hands.length === 0) continue;

    // Find best hand(s)
    hands.sort((a, b) => compareHands(b.hand, a.hand));
    const bestScore = hands[0].hand.score;
    const winners = hands.filter(h => h.hand.score === bestScore);

    // Split pot among winners
    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;

    for (let i = 0; i < winners.length; i++) {
      results.push({
        playerId: winners[i].playerId,
        amount: share + (i === 0 ? remainder : 0), // first winner gets remainder
        hand: winners[i].hand,
        potIndex,
      });
    }
  }

  return results;
}

/**
 * Apply winner results to player stacks and reset for next hand.
 */
export function applyWinnings(state: GameState, winners: WinnerResult[]): GameState {
  const players = state.players.map(p => ({ ...p }));

  for (const w of winners) {
    const player = players.find(p => p.id === w.playerId);
    if (player) {
      player.stack += w.amount;
    }
  }

  // Remove busted players (stack = 0) — mark as sitting out
  for (const p of players) {
    if (p.stack === 0 && p.status !== 'sitting-out') {
      p.status = 'sitting-out';
    }
  }

  return {
    ...state,
    players,
    phase: 'waiting',
    pot: 0,
    sidePots: [],
    communityCards: [],
    currentPlayerIndex: -1,
  };
}

// ===== State Sanitization for Client =====

export function sanitizeStateForPlayer(
  state: GameState,
  playerId: string,
): ClientGameState {
  const player = state.players.find(p => p.id === playerId);
  const validActions = player && state.currentPlayerIndex >= 0 &&
    state.players[state.currentPlayerIndex]?.id === playerId
    ? getValidActionsForPlayer(state, playerId)
    : [];

  const clientPlayers: ClientPlayerState[] = state.players.map(p => ({
    id: p.id,
    name: p.name,
    seatIndex: p.seatIndex,
    stack: p.stack,
    currentBet: p.currentBet,
    totalBetThisHand: p.totalBetThisHand,
    status: p.status,
    isConnected: p.isConnected,
    hasActed: p.hasActed,
    holeCards:
      p.id === playerId
        ? p.holeCards
        : state.phase === 'showdown' && (p.status === 'active' || p.status === 'all-in')
          ? p.holeCards
          : null,
    isCurrentPlayer: state.currentPlayerIndex >= 0 &&
      state.players[state.currentPlayerIndex]?.id === p.id,
  }));

  return {
    id: state.id,
    mode: state.mode,
    phase: state.phase,
    players: clientPlayers,
    communityCards: state.communityCards,
    pot: state.pot,
    sidePots: state.sidePots,
    currentPlayerIndex: state.currentPlayerIndex,
    dealerIndex: state.dealerIndex,
    smallBlind: state.smallBlind,
    bigBlind: state.bigBlind,
    minRaise: state.minRaise,
    currentBet: state.currentBet,
    handNumber: state.handNumber,
    validActions,
  };
}

function getValidActionsForPlayer(state: GameState, playerId: string): PlayerAction[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.status !== 'active') return [];

  const actions: PlayerAction[] = ['fold'];
  const { canCheck, canCall, canRaise, canAllIn } = getValidActions(
    player,
    state.currentBet,
    state.minRaise,
  );

  if (canCheck) actions.push('check');
  if (canCall) actions.push('call');
  if (canRaise) actions.push('raise');
  if (canAllIn) actions.push('all-in');

  return actions;
}
