import { describe, it, expect } from 'vitest';
import { evaluateProgress } from './progress';
import type { HistoryEntry } from '../types';

const makeEntry = (overrides: Partial<HistoryEntry> & { co2_kg: number }): HistoryEntry => ({
  id: Date.now() + Math.random(),
  date: new Date().toISOString(),
  activity: 'test',
  category: 'transport',
  quantity: 10,
  unit: 'km',
  ...overrides,
});

describe('evaluateProgress', () => {
  it('returns score 0 and empty verdict for empty history', () => {
    const { score, verdict } = evaluateProgress([]);
    expect(score).toBe(0);
    expect(verdict).toBe('');
  });

  it('returns a score between 0 and 100 for valid history', () => {
    const history = [makeEntry({ co2_kg: 5 }), makeEntry({ co2_kg: 10 })];
    const { score } = evaluateProgress(history);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives higher score when latest entry is lower than previous', () => {
    const improving = [makeEntry({ co2_kg: 2 }), makeEntry({ co2_kg: 10 })];
    const worsening = [makeEntry({ co2_kg: 10 }), makeEntry({ co2_kg: 2 })];
    const { score: improvingScore } = evaluateProgress(improving);
    const { score: worseningScore } = evaluateProgress(worsening);
    expect(improvingScore).toBeGreaterThan(worseningScore);
  });

  it('returns appropriate verdict strings based on score range', () => {
    // Single entry with low emissions -> should be "On track" or "Excellent"
    const single = [makeEntry({ co2_kg: 1 })];
    const { verdict } = evaluateProgress(single);
    expect(['Needs work', 'Getting better', 'On track', 'Excellent']).toContain(verdict);
  });

  it('clamps score to 0 floor and 100 ceiling', () => {
    // Huge worsening delta to try to push below 0
    const extreme = [makeEntry({ co2_kg: 999 }), makeEntry({ co2_kg: 0.01 })];
    const { score } = evaluateProgress(extreme);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
