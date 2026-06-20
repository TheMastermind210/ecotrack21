import { useEffect, useState } from 'react';
import type { HistoryEntry } from '../types';
import { readHistory } from '../utils/storage';

/** Manages carbon history state with automatic localStorage persistence and error recovery. */
export function usePersistentHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory(localStorage));
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('carbon_history', JSON.stringify(history));
      queueMicrotask(() => setStorageError(''));
    } catch {
      queueMicrotask(() => {
        setStorageError('History could not be saved in this browser session.');
      });
    }
  }, [history]);

  return { history, setHistory, storageError };
}
