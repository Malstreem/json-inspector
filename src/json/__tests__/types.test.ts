import { describe, expect, it } from 'vitest';
import { computeJsonDepth } from '../types';

describe('computeJsonDepth', () => {
  it('returns 0 for primitives', () => {
    expect(computeJsonDepth(42)).toBe(0);
    expect(computeJsonDepth('hello')).toBe(0);
    expect(computeJsonDepth(null)).toBe(0);
  });

  it('returns 1 for flat objects and arrays', () => {
    expect(computeJsonDepth({ a: 1, b: 2 })).toBe(1);
    expect(computeJsonDepth([1, 2, 3])).toBe(1);
  });

  it('returns exact nesting depth for nested structures', () => {
    expect(computeJsonDepth({ a: { b: { c: [1, 2] } } })).toBe(4);
  });
});
