import type { HistoryEntry } from '../types';

export interface ProgressEvaluation {
  score: number;
  verdict: '' | 'Needs work' | 'Getting better' | 'On track' | 'Excellent';
}

const intensity = (entry: HistoryEntry) =>
  entry.quantity > 0 ? entry.co2_kg / entry.quantity : entry.co2_kg;

/**
 * Compares like-for-like activity intensity instead of unrelated consecutive
 * activities. This avoids rewarding a small meal merely because it followed a
 * long drive.
 */
export function evaluateProgress(history: HistoryEntry[]): ProgressEvaluation {
  if (history.length === 0) return { score: 0, verdict: '' };

  const latest = history[0];
  const comparable = latest
    ? history.slice(1).find(entry => entry.category === latest.category)
    : undefined;
  const improvement = latest && comparable
    ? ((intensity(comparable) - intensity(latest)) / Math.max(intensity(comparable), 0.01)) * 30
    : 0;
  const consistency = Math.min(history.length, 10) * 3;
  const score = Math.round(Math.max(0, Math.min(100, 50 + improvement + consistency)));

  if (score <= 40) return { score, verdict: 'Needs work' };
  if (score <= 70) return { score, verdict: 'Getting better' };
  if (score <= 90) return { score, verdict: 'On track' };
  return { score, verdict: 'Excellent' };
}
