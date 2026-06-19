import { describe, expect, it, vi } from 'vitest';
import { isHistoryEntry, readHistory } from './storage';

const validEntry = {
  id: 1,
  date: '2026-06-20T00:00:00.000Z',
  activity: 'cycled to work',
  category: 'transport',
  quantity: 8,
  unit: 'km',
  co2_kg: 0,
};

describe('history storage validation', () => {
  it('accepts a complete valid history entry', () => {
    expect(isHistoryEntry(validEntry)).toBe(true);
  });

  it.each([
    { ...validEntry, date: 'invalid-date' },
    { ...validEntry, category: 'unknown' },
    { ...validEntry, quantity: Number.NaN },
    { ...validEntry, co2_kg: -1 },
    { ...validEntry, activity: ' ' },
  ])('rejects malformed persisted data', (entry) => {
    expect(isHistoryEntry(entry)).toBe(false);
  });

  it('returns only valid entries from persisted arrays', () => {
    const storage = {
      getItem: vi.fn(() => JSON.stringify([validEntry, { broken: true }])),
    };

    expect(readHistory(storage)).toEqual([validEntry]);
  });

  it('recovers from invalid JSON and storage access failures', () => {
    expect(readHistory({ getItem: () => '{' })).toEqual([]);
    expect(readHistory({ getItem: () => { throw new Error('blocked'); } })).toEqual([]);
  });
});
