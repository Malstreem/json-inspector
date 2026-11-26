import { describe, expect, it } from 'vitest';
import { diffJson } from '../diff';

describe('diffJson', () => {
  it('returns empty array for identical values', () => {
    const a = { name: 'Alice', tags: ['a', 'b'], meta: { active: true } };
    const b = { name: 'Alice', tags: ['a', 'b'], meta: { active: true } };
    expect(diffJson(a, b)).toEqual([]);
  });

  it('detects added, removed, and changed object properties', () => {
    const a = { keep: 1, change: 'old', remove: true };
    const b = { keep: 1, change: 'new', add: 42 };
    const result = diffJson(a, b);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      path: ['change'],
      formattedPath: '$.change',
      kind: 'changed',
      before: 'old',
      after: 'new',
    });
    expect(result).toContainEqual({
      path: ['remove'],
      formattedPath: '$.remove',
      kind: 'removed',
      before: true,
    });
    expect(result).toContainEqual({
      path: ['add'],
      formattedPath: '$.add',
      kind: 'added',
      after: 42,
    });
  });

  it('detects differences inside nested arrays and objects', () => {
    const a = { items: [{ id: 1, val: 'a' }, { id: 2, val: 'b' }] };
    const b = { items: [{ id: 1, val: 'a' }, { id: 2, val: 'c' }, { id: 3, val: 'd' }] };
    const result = diffJson(a, b);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      path: ['items', 1, 'val'],
      formattedPath: '$.items[1].val',
      kind: 'changed',
      before: 'b',
      after: 'c',
    });
    expect(result[1]).toEqual({
      path: ['items', 2],
      formattedPath: '$.items[2]',
      kind: 'added',
      after: { id: 3, val: 'd' },
    });
  });
});
