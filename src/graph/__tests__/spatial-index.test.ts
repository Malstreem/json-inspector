import { describe, expect, it } from 'vitest';
import type { BoundingBox } from '../layout';
import { SpatialIndex } from '../spatial-index';

function bounds(minX: number, minY: number, maxX: number, maxY: number): BoundingBox {
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

describe('SpatialIndex', () => {
  it('returns only entries intersecting the requested bounds', () => {
    const index = new SpatialIndex([
      { bounds: bounds(0, 0, 10, 10), value: 'near' },
      { bounds: bounds(100, 100, 110, 110), value: 'far' },
      { bounds: bounds(8, 8, 18, 18), value: 'overlapping' },
    ]);

    expect(index.query(bounds(9, 9, 12, 12))).toEqual(
      expect.arrayContaining(['near', 'overlapping'])
    );
    expect(index.query(bounds(9, 9, 12, 12))).not.toContain('far');
  });

  it('returns no entries when the index is empty', () => {
    expect(new SpatialIndex([]).query(bounds(0, 0, 1, 1))).toEqual([]);
  });

  it('searches all index branches for intersecting entries', () => {
    const entries = Array.from({ length: 64 }, (_, index) => ({
      bounds: bounds(index * 100, index * 100, index * 100 + 10, index * 100 + 10),
      value: index,
    }));
    const index = new SpatialIndex(entries);

    expect(index.query(bounds(2500, 2500, 2510, 2510))).toEqual([25]);
  });
});
