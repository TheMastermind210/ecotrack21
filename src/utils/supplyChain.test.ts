import { describe, expect, it } from 'vitest';
import { validateSupplyChainData } from './supplyChain';

const validData = [
  {
    id: 'root',
    source: 'Root',
    factor: 1,
    unit: 'kg',
    category: 'goods',
    dependencies: ['child'],
  },
  {
    id: 'child',
    source: 'Child',
    factor: 0,
    unit: 'kg',
    category: 'goods',
    dependencies: [],
  },
];

describe('supply-chain validation', () => {
  it('accepts a connected valid graph', () => {
    expect(validateSupplyChainData(validData)).toEqual(validData);
  });

  it('rejects malformed, duplicate, and dangling graph data', () => {
    expect(() => validateSupplyChainData([])).toThrow('invalid schema');
    expect(() => validateSupplyChainData([{ ...validData[0], factor: -1 }])).toThrow();
    expect(() => validateSupplyChainData([validData[0], { ...validData[1], id: 'root' }]))
      .toThrow('duplicate');
    expect(() => validateSupplyChainData([validData[0]])).toThrow('unknown dependency');
  });
});
