import { useEffect, useState } from 'react';
import type { HistoryEntry } from '../types';

/** Fetches an AI-generated counterfactual narrative after a 2-second debounce. Aborts on unmount. */
export function useAttributionNarrative(
  history: HistoryEntry[],
  enabled: boolean,
  getNarrative: (history: HistoryEntry[], signal?: AbortSignal) => Promise<string>,
) {
  const [narrative, setNarrative] = useState('');
  const [narrativeError, setNarrativeError] = useState('');

  useEffect(() => {
    if (!enabled || history.length === 0) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getNarrative(history.slice(0, 10), controller.signal)
        .then(value => {
          setNarrative(value);
          setNarrativeError('');
        })
        .catch(error => {
          if (error instanceof Error && error.name !== 'AbortError') {
            setNarrativeError('Personalized insight generation failed.');
          }
        });
    }, 2_000);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, getNarrative, history]);

  return {
    narrative: enabled && history.length > 0 ? narrative : '',
    narrativeError,
  };
}
