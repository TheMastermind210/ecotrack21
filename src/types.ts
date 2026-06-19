export const ACTIVITY_CATEGORIES = ['transport', 'food', 'energy', 'goods'] as const;

export type ActivityCategory = typeof ACTIVITY_CATEGORIES[number];

export interface HistoryEntry {
  id: number;
  date: string;
  activity: string;
  category: ActivityCategory;
  quantity: number;
  unit: string;
  co2_kg: number;
}

export interface SupplyChainNode {
  id: string;
  source: string;
  factor: number;
  unit: string;
  category: string;
  dependencies: string[];
}
