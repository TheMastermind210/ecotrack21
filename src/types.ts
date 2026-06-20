/** Supported carbon emission categories used throughout the application. */
export const ACTIVITY_CATEGORIES = ['transport', 'food', 'energy', 'goods'] as const;

/** Union type derived from ACTIVITY_CATEGORIES for compile-time category validation. */
export type ActivityCategory = typeof ACTIVITY_CATEGORIES[number];

/**
 * Represents a single logged carbon emission activity.
 * Created when a user submits an activity through the NLP command bar.
 */
export interface HistoryEntry {
  /** Unique identifier generated from Date.now() at creation time. */
  id: number;
  /** ISO 8601 date string indicating when the activity was logged. */
  date: string;
  /** Human-readable description of the activity (e.g. "Drove 40km to work"). */
  activity: string;
  /** Emission category assigned by the AI parser. */
  category: ActivityCategory;
  /** Numeric quantity extracted from the activity description. */
  quantity: number;
  /** Measurement unit for the quantity (e.g. "km", "kWh", "kg"). */
  unit: string;
  /** Calculated CO₂ equivalent in kilograms, computed by the WASM engine. */
  co2_kg: number;
}

/**
 * Node in the Scope 3 supply chain force-directed graph.
 * Loaded from the static supply-chain.json dataset.
 */
export interface SupplyChainNode {
  /** Unique identifier for this supply chain node. */
  id: string;
  /** Source or origin of this emission factor. */
  source: string;
  /** Emission factor value used for CO₂ calculation. */
  factor: number;
  /** Unit of measurement for the emission factor. */
  unit: string;
  /** Category this node belongs to (transport, food, energy, goods). */
  category: string;
  /** IDs of other nodes this node depends on in the supply chain. */
  dependencies: string[];
}
