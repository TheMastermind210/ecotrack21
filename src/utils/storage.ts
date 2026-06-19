import { ACTIVITY_CATEGORIES, type HistoryEntry } from '../types';

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'number' &&
    Number.isFinite(entry.id) &&
    typeof entry.date === 'string' &&
    !Number.isNaN(Date.parse(entry.date)) &&
    typeof entry.activity === 'string' &&
    entry.activity.trim().length > 0 &&
    ACTIVITY_CATEGORIES.includes(entry.category as HistoryEntry['category']) &&
    isFiniteNonNegative(entry.quantity) &&
    typeof entry.unit === 'string' &&
    isFiniteNonNegative(entry.co2_kg)
  );
}

/**
 * Reads persisted history without allowing malformed or stale browser data to
 * crash application startup.
 */
export function readHistory(storage: Pick<Storage, 'getItem'>): HistoryEntry[] {
  try {
    const raw = storage.getItem('carbon_history');
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry) : [];
  } catch {
    return [];
  }
}
