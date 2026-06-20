import type { SupplyChainNode } from '../types';

/** Type guard that validates a single value conforms to the SupplyChainNode interface. */
function isSupplyChainNode(value: unknown): value is SupplyChainNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as Record<string, unknown>;

  return (
    typeof node.id === 'string' &&
    node.id.trim().length > 0 &&
    typeof node.source === 'string' &&
    node.source.trim().length > 0 &&
    typeof node.factor === 'number' &&
    Number.isFinite(node.factor) &&
    node.factor >= 0 &&
    typeof node.unit === 'string' &&
    node.unit.trim().length > 0 &&
    typeof node.category === 'string' &&
    node.category.trim().length > 0 &&
    Array.isArray(node.dependencies) &&
    node.dependencies.every(dependency => typeof dependency === 'string')
  );
}

/**
 * Validates and returns a typed array of SupplyChainNode from raw JSON.
 * @throws {Error} If schema is invalid, IDs are duplicated, or dependencies reference unknown nodes.
 */
export function validateSupplyChainData(value: unknown): SupplyChainNode[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isSupplyChainNode)) {
    throw new Error('Supply-chain data has an invalid schema');
  }

  const ids = new Set(value.map(node => node.id));
  if (ids.size !== value.length) {
    throw new Error('Supply-chain data contains duplicate node IDs');
  }

  const hasUnknownDependency = value.some(node =>
    node.dependencies.some(dependency => !ids.has(dependency)),
  );
  if (hasUnknownDependency) {
    throw new Error('Supply-chain data references an unknown dependency');
  }

  return value;
}
