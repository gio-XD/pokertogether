import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands } from '../hand-evaluator';
import type { Card } from '../types';

function c(rank: string, suit: string): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] };
}

describe('Hand Evaluator - Regular Mode', () => {
  it('detects royal flush', () => {
    const cards = [
      c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'),
      c('J', 'hearts'), c('T', 'hearts'), c('3', 'clubs'), c('7', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('royal-flush');
  });

  it('detects straight flush', () => {
    const cards = [
      c('9', 'spades'), c('8', 'spades'), c('7', 'spades'),
      c('6', 'spades'), c('5', 'spades'), c('K', 'hearts'), c('2', 'clubs'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('straight-flush');
  });

  it('detects four of a kind', () => {
    const cards = [
      c('Q', 'hearts'), c('Q', 'diamonds'), c('Q', 'clubs'),
      c('Q', 'spades'), c('A', 'hearts'), c('3', 'clubs'), c('7', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('four-of-a-kind');
  });

  it('detects full house', () => {
    const cards = [
      c('K', 'hearts'), c('K', 'diamonds'), c('K', 'clubs'),
      c('9', 'spades'), c('9', 'hearts'), c('3', 'clubs'), c('7', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('full-house');
  });

  it('detects flush', () => {
    const cards = [
      c('A', 'hearts'), c('J', 'hearts'), c('9', 'hearts'),
      c('6', 'hearts'), c('3', 'hearts'), c('K', 'clubs'), c('2', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('flush');
  });

  it('detects straight', () => {
    const cards = [
      c('T', 'hearts'), c('9', 'diamonds'), c('8', 'clubs'),
      c('7', 'spades'), c('6', 'hearts'), c('2', 'clubs'), c('3', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('straight');
  });

  it('detects wheel straight (A-2-3-4-5)', () => {
    const cards = [
      c('A', 'hearts'), c('2', 'diamonds'), c('3', 'clubs'),
      c('4', 'spades'), c('5', 'hearts'), c('K', 'clubs'), c('9', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('straight');
  });

  it('detects three of a kind', () => {
    const cards = [
      c('J', 'hearts'), c('J', 'diamonds'), c('J', 'clubs'),
      c('8', 'spades'), c('3', 'hearts'), c('K', 'clubs'), c('2', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('three-of-a-kind');
  });

  it('detects two pair', () => {
    const cards = [
      c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'),
      c('K', 'spades'), c('3', 'hearts'), c('7', 'clubs'), c('2', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('two-pair');
  });

  it('detects one pair', () => {
    const cards = [
      c('T', 'hearts'), c('T', 'diamonds'), c('A', 'clubs'),
      c('K', 'spades'), c('8', 'hearts'), c('3', 'clubs'), c('2', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('one-pair');
  });

  it('detects high card', () => {
    const cards = [
      c('A', 'hearts'), c('K', 'diamonds'), c('9', 'clubs'),
      c('7', 'spades'), c('4', 'hearts'), c('3', 'clubs'), c('2', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'regular');
    expect(result.rank).toBe('high-card');
  });

  it('royal flush beats straight flush', () => {
    const rf = evaluateHand([
      c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'),
      c('J', 'hearts'), c('T', 'hearts'), c('3', 'clubs'), c('7', 'diamonds'),
    ], 'regular');
    const sf = evaluateHand([
      c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'),
      c('T', 'spades'), c('9', 'spades'), c('3', 'clubs'), c('7', 'diamonds'),
    ], 'regular');
    expect(compareHands(rf, sf)).toBeGreaterThan(0);
  });

  it('full house beats flush in regular mode', () => {
    const fh = evaluateHand([
      c('K', 'hearts'), c('K', 'diamonds'), c('K', 'clubs'),
      c('9', 'spades'), c('9', 'hearts'), c('3', 'clubs'), c('2', 'diamonds'),
    ], 'regular');
    const fl = evaluateHand([
      c('A', 'hearts'), c('J', 'hearts'), c('9', 'hearts'),
      c('6', 'hearts'), c('3', 'hearts'), c('K', 'clubs'), c('2', 'diamonds'),
    ], 'regular');
    expect(compareHands(fh, fl)).toBeGreaterThan(0);
  });

  it('higher kicker wins with same pair', () => {
    const h1 = evaluateHand([
      c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'),
      c('Q', 'spades'), c('J', 'hearts'), c('3', 'clubs'), c('2', 'diamonds'),
    ], 'regular');
    const h2 = evaluateHand([
      c('A', 'clubs'), c('A', 'spades'), c('K', 'hearts'),
      c('Q', 'diamonds'), c('T', 'clubs'), c('3', 'diamonds'), c('2', 'hearts'),
    ], 'regular');
    expect(compareHands(h1, h2)).toBeGreaterThan(0);
  });

  it('wheel straight loses to 6-high straight', () => {
    const wheel = evaluateHand([
      c('A', 'hearts'), c('2', 'diamonds'), c('3', 'clubs'),
      c('4', 'spades'), c('5', 'hearts'), c('8', 'clubs'), c('9', 'diamonds'),
    ], 'regular');
    const six = evaluateHand([
      c('6', 'hearts'), c('2', 'diamonds'), c('3', 'clubs'),
      c('4', 'spades'), c('5', 'hearts'), c('8', 'clubs'), c('9', 'diamonds'),
    ], 'regular');
    expect(compareHands(six, wheel)).toBeGreaterThan(0);
  });

  it('split pot with identical hands', () => {
    const h1 = evaluateHand([
      c('A', 'hearts'), c('K', 'hearts'), c('Q', 'clubs'),
      c('J', 'diamonds'), c('T', 'spades'), c('3', 'clubs'), c('2', 'diamonds'),
    ], 'regular');
    const h2 = evaluateHand([
      c('A', 'diamonds'), c('K', 'diamonds'), c('Q', 'clubs'),
      c('J', 'diamonds'), c('T', 'spades'), c('3', 'clubs'), c('2', 'diamonds'),
    ], 'regular');
    expect(compareHands(h1, h2)).toBe(0);
  });
});

describe('Hand Evaluator - Short Deck Mode', () => {
  it('flush beats full house in short deck', () => {
    const flush = evaluateHand([
      c('A', 'hearts'), c('J', 'hearts'), c('9', 'hearts'),
      c('7', 'hearts'), c('6', 'hearts'), c('K', 'clubs'), c('8', 'diamonds'),
    ], 'short-deck');
    const fh = evaluateHand([
      c('K', 'hearts'), c('K', 'diamonds'), c('K', 'clubs'),
      c('9', 'spades'), c('9', 'hearts'), c('6', 'clubs'), c('8', 'diamonds'),
    ], 'short-deck');
    expect(compareHands(flush, fh)).toBeGreaterThan(0);
  });

  it('three of a kind beats straight in short deck', () => {
    const trips = evaluateHand([
      c('J', 'hearts'), c('J', 'diamonds'), c('J', 'clubs'),
      c('8', 'spades'), c('6', 'hearts'), c('K', 'clubs'), c('A', 'diamonds'),
    ], 'short-deck');
    const straight = evaluateHand([
      c('T', 'hearts'), c('9', 'diamonds'), c('8', 'clubs'),
      c('7', 'spades'), c('6', 'hearts'), c('K', 'clubs'), c('A', 'diamonds'),
    ], 'short-deck');
    expect(compareHands(trips, straight)).toBeGreaterThan(0);
  });

  it('detects A-6-7-8-9 straight in short deck', () => {
    const cards = [
      c('A', 'hearts'), c('6', 'diamonds'), c('7', 'clubs'),
      c('8', 'spades'), c('9', 'hearts'), c('K', 'clubs'), c('J', 'diamonds'),
    ];
    const result = evaluateHand(cards, 'short-deck');
    expect(result.rank).toBe('straight');
  });

  it('A-6-7-8-9 is the lowest straight in short deck', () => {
    const low = evaluateHand([
      c('A', 'hearts'), c('6', 'diamonds'), c('7', 'clubs'),
      c('8', 'spades'), c('9', 'hearts'), c('K', 'clubs'), c('J', 'diamonds'),
    ], 'short-deck');
    const higher = evaluateHand([
      c('T', 'hearts'), c('6', 'diamonds'), c('7', 'clubs'),
      c('8', 'spades'), c('9', 'hearts'), c('K', 'clubs'), c('J', 'diamonds'),
    ], 'short-deck');
    expect(compareHands(higher, low)).toBeGreaterThan(0);
  });
});
