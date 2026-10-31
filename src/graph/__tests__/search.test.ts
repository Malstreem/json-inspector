import { describe, expect, it } from 'vitest';
import { buildGraph, collapseAll, flattenRows } from '../model';
import { searchNodes } from '../search';

describe('graph search', () => {
  it('finds case-insensitive matches in visible keys and values', () => {
    const { root } = buildGraph({ UserName: 'Arman', count: 2 });
    const rows = flattenRows(root);

    expect(searchNodes(rows, 'username')).toEqual([0]);
    expect(searchNodes(rows, 'ARMAN')).toEqual([0]);
    expect(searchNodes(rows, 'missing')).toEqual([]);
  });

  it('does not match rows hidden by a collapsed parent', () => {
    const { root } = buildGraph({ account: { email: 'person@example.com' } });
    collapseAll(root);

    expect(searchNodes(flattenRows(root), 'person@example.com')).toEqual([]);
  });
});
