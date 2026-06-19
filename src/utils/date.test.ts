import { describe, expect, it } from 'vitest';
import { getIsoWeekKey, getLocalDateKey } from './date';

describe('date utilities', () => {
  it('uses the browser-local calendar date instead of the UTC date', () => {
    const localLateNight = new Date(2026, 5, 20, 23, 30);
    expect(getLocalDateKey(localLateNight)).toBe('2026-06-20');
  });

  it('handles ISO week boundaries across calendar years', () => {
    expect(getIsoWeekKey(new Date(2021, 0, 1))).toBe('2020-W53');
    expect(getIsoWeekKey(new Date(2021, 0, 4))).toBe('2021-W01');
  });

  it('returns null for invalid dates', () => {
    expect(getLocalDateKey('invalid')).toBeNull();
    expect(getIsoWeekKey('invalid')).toBeNull();
  });
});
