import { describe, it, expect } from 'vitest';
import { buildGraph, flattenRows, toggleRow, collapseAll, expandAll } from '../model';

describe('buildGraph', () => {
  it('handles primitive values', () => {
    const result = buildGraph(42);
    expect(result.nodeCount).toBe(1);
    expect(result.root.pill).toBe(true);
    expect(result.root.rows[0].t).toBe('42');
  });

  it('handles null', () => {
    const result = buildGraph(null);
    expect(result.nodeCount).toBe(1);
    expect(result.root.rows[0].t).toBe('null');
  });

  it('handles string values', () => {
    const result = buildGraph('hello');
    expect(result.root.rows[0].t).toBe('"hello"');
  });

  it('handles simple objects', () => {
    const result = buildGraph({ name: 'test', value: 42 });
    expect(result.nodeCount).toBe(1);
    expect(result.root.pill).toBe(false);
    expect(result.root.rows).toHaveLength(2);
    expect(result.root.rows[0].k).toBe('name: ');
    expect(result.root.rows[0].t).toBe('"test"');
    expect(result.root.rows[1].k).toBe('value: ');
    expect(result.root.rows[1].t).toBe('42');
  });

  it('handles nested objects', () => {
    const result = buildGraph({ outer: { inner: 'value' } });
    expect(result.nodeCount).toBe(2);
    expect(result.root.rows[0].kids).toBeDefined();
    expect(result.root.rows[0].kids!.length).toBe(1);
    expect(result.root.rows[0].t).toBe('{1 key}');
  });

  it('handles arrays', () => {
    const result = buildGraph([1, 2, 3]);
    expect(result.nodeCount).toBe(1);
    expect(result.root.rows).toHaveLength(3);
  });

  it('handles arrays of objects', () => {
    const result = buildGraph([{ a: 1 }, { b: 2 }]);
    // Root array node + 2 object nodes
    expect(result.nodeCount).toBe(3);
  });

  it('handles mixed arrays (primitives and objects)', () => {
    const result = buildGraph([1, { a: 2 }, 'three']);
    expect(result.nodeCount).toBeGreaterThanOrEqual(2);
  });

  it('handles empty objects', () => {
    const result = buildGraph({});
    expect(result.root.rows).toHaveLength(0);
  });

  it('handles empty arrays', () => {
    const result = buildGraph([]);
    expect(result.root.rows).toHaveLength(0);
  });

  it('handles deeply nested structures', () => {
    const result = buildGraph({ a: { b: { c: { d: 'deep' } } } });
    expect(result.nodeCount).toBe(4);
  });
});

describe('flattenRows', () => {
  it('returns all rows in order', () => {
    const { root } = buildGraph({ a: 1, b: 2, c: 3 });
    const flat = flattenRows(root);
    expect(flat).toHaveLength(3);
    expect(flat[0].row.k).toBe('a: ');
    expect(flat[1].row.k).toBe('b: ');
    expect(flat[2].row.k).toBe('c: ');
  });

  it('includes children when expanded', () => {
    const { root } = buildGraph({ outer: { inner: 1 } });
    const flat = flattenRows(root);
    // outer row + inner object's row
    expect(flat.length).toBeGreaterThan(1);
  });

  it('excludes children when collapsed', () => {
    const { root } = buildGraph({ outer: { inner: 1 } });
    root.rows[0].open = false;
    const flat = flattenRows(root);
    expect(flat).toHaveLength(1);
  });
});

describe('toggleRow', () => {
  it('toggles open state', () => {
    const { root } = buildGraph({ items: [1, 2, 3] });
    const row = root.rows[0];
    expect(row.open).toBe(true);
    toggleRow(row);
    expect(row.open).toBe(false);
    toggleRow(row);
    expect(row.open).toBe(true);
  });

  it('returns false for rows without kids', () => {
    const { root } = buildGraph({ name: 'test' });
    expect(toggleRow(root.rows[0])).toBe(false);
  });
});

describe('collapseAll / expandAll', () => {
  it('collapses all nodes', () => {
    const { root } = buildGraph({ a: { b: { c: 1 } }, d: [1, 2] });
    collapseAll(root);
    const flat = flattenRows(root);
    expect(flat).toHaveLength(2); // only top-level rows
  });

  it('expands all nodes', () => {
    const { root } = buildGraph({ a: { b: { c: 1 } }, d: [1, 2] });
    collapseAll(root);
    expandAll(root);
    const flat = flattenRows(root);
    expect(flat.length).toBeGreaterThan(2);
  });
});
