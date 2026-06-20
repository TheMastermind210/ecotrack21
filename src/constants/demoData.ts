import type { HistoryEntry } from '../types';

/**
 * Returns a set of default demo entries to populate the application for demonstration purposes.
 * @returns Array of realistic carbon history entries
 */
export const getDemoData = (): HistoryEntry[] => {
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  
  return [
    { id: Date.now() + 1, date: today, activity: 'Drove 20 miles to work', category: 'transport', quantity: 32.18, unit: 'km', co2_kg: 8.4 },
    { id: Date.now() + 2, date: today, activity: 'Ate a beef burger for lunch', category: 'food', quantity: 1, unit: 'meal', co2_kg: 4.2 },
    { id: Date.now() + 3, date: yesterday, activity: 'Ran the AC all day', category: 'energy', quantity: 15, unit: 'kWh', co2_kg: 6.5 }
  ];
};
