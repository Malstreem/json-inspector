import { describe, it, expect } from 'vitest';
import { buildGraph } from '../projection';
import { layoutNode, computeBounds } from '../layout';

describe('layoutNode', () => {
  it('positions root at given coordinates', () => {
    const { root } = buildGraph({ a: 1 });
    layoutNode(root, 50, 50);
    expect(root.x).toBe(50);
    expect(root.y).toBeGreaterThanOrEqual(50);
  });

  it('positions children to the right of parent', () => {
    const { root } = buildGraph({ child: { inner: 1 } });
    layoutNode(root, 0, 0);
    const childNode = root.rows[0].children![0];
    expect(childNode.x).toBeGreaterThan(root.x + root.width);
  });

  it('returns positive height', () => {
    const { root } = buildGraph({ a: 1, b: 2, c: 3 });
    const h = layoutNode(root, 0, 0);
    expect(h).toBeGreaterThan(0);
  });

  it('handles deeply nested structures without overlap', () => {
    const { root } = buildGraph({
      a: { b: 1 },
      c: { d: 2 },
    });
    layoutNode(root, 0, 0);
    const child1 = root.rows[0].children![0];
    const child2 = root.rows[1].children![0];
    // Children should not overlap vertically
    const c1Bottom = child1.y + child1.height;
    const c2Top = child2.y;
    expect(c2Top).toBeGreaterThanOrEqual(c1Bottom);
  });
});

describe('computeBounds', () => {
  it('returns correct bounding box', () => {
    const { root } = buildGraph({ a: 1, b: { c: 2 } });
    layoutNode(root, 0, 0);
    const bounds = computeBounds(root);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    expect(bounds.minX).toBeLessThanOrEqual(root.x);
  });
});
