import { describe, it, expect } from 'vitest';
import {
  GraphDepthError,
  MAX_GRAPH_DEPTH,
  flattenRows,
  collapseAll,
  expandAll,
  buildGraph,
  toggleRow,
} from '../projection';
import type { JsonValue } from '../../json/types';

describe('graph projection', () => {
  it('handles primitive values', () => {
    const result = buildGraph(42);
    expect(result.nodeCount).toBe(1);
    expect(result.root.isPill).toBe(true);
    expect(result.root.rows[0].value).toBe('42');
  });

  it('handles null', () => {
    const result = buildGraph(null);
    expect(result.nodeCount).toBe(1);
    expect(result.root.rows[0].value).toBe('null');
  });

  it('handles string values', () => {
    const result = buildGraph('hello');
    expect(result.root.rows[0].value).toBe('"hello"');
  });

  it('handles simple objects', () => {
    const result = buildGraph({ name: 'test', value: 42 });
    expect(result.nodeCount).toBe(1);
    expect(result.root.isPill).toBe(false);
    expect(result.root.rows).toHaveLength(2);
    expect(result.root.rows[0].key).toBe('name');
    expect(result.root.rows[0].value).toBe('"test"');
    expect(result.root.rows[1].key).toBe('value');
    expect(result.root.rows[1].value).toBe('42');
  });

  it('handles nested objects', () => {
    const result = buildGraph({ outer: { inner: 'value' } });
    expect(result.nodeCount).toBe(2);
    expect(result.root.rows[0].children).toBeDefined();
    expect(result.root.rows[0].children!.length).toBe(1);
    expect(result.root.rows[0].value).toBe('{1 key}');
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

  it('keeps build counts independent across graph constructions', () => {
    const first = buildGraph({ child: { value: 1 } });
    const second = buildGraph({ value: 1 });

    expect(first.nodeCount).toBe(2);
    expect(second.nodeCount).toBe(1);
  });

  it('accepts JSON at the supported graph depth', () => {
    let value: JsonValue = 'leaf';
    for (let depth = 0; depth <= MAX_GRAPH_DEPTH; depth++) {
      value = { child: value };
    }

    expect(() => buildGraph(value)).not.toThrow();
  });

  it('rejects JSON beyond the supported graph depth', () => {
    let value: JsonValue = 'leaf';
    for (let depth = 0; depth <= MAX_GRAPH_DEPTH; depth++) {
      value = { child: value };
    }
    value = { child: value };

    expect(() => buildGraph(value)).toThrow(GraphDepthError);
  });

  it('sizes nodes to fit long object keys', () => {
    const key = 'a'.repeat(100);
    const { root } = buildGraph({ [key]: true });

    expect(root.width).toBeGreaterThan(800);
  });
});

describe('flattenRows', () => {
  it('returns all rows in order', () => {
    const { root } = buildGraph({ a: 1, b: 2, c: 3 });
    const flat = flattenRows(root);
    expect(flat).toHaveLength(3);
    expect(flat[0].row.key).toBe('a');
    expect(flat[1].row.key).toBe('b');
    expect(flat[2].row.key).toBe('c');
  });

  it('includes children when expanded', () => {
    const { root } = buildGraph({ outer: { inner: 1 } });
    const flat = flattenRows(root);
    // outer row + inner object's row
    expect(flat.length).toBeGreaterThan(1);
  });

  it('excludes children when collapsed', () => {
    const { root } = buildGraph({ outer: { inner: 1 } });
    root.rows[0].isExpanded = false;
    const flat = flattenRows(root);
    expect(flat).toHaveLength(1);
  });

  it('retains original values and JSON paths for each visible row', () => {
    const source = {
      users: [{ name: 'Ada' }],
      'display.name': true,
      flags: [true, false],
    };
    const { root } = buildGraph(source);
    expandAll(root);
    const flat = flattenRows(root);
    const nameRow = flat.find(({ row }) => row.key === 'name');
    const specialKeyRow = flat.find(({ row }) => row.key === 'display.name');
    const firstFlagRow = flat.find(({ row }) => row.key === null && row.sourceValue === true);

    expect(nameRow?.row.sourceValue).toBe('Ada');
    expect(nameRow?.path).toEqual(['users', 0, 'name']);
    expect(specialKeyRow?.path).toEqual(['display.name']);
    expect(firstFlagRow?.path).toEqual(['flags', 0]);
  });

  it('retains the original value and JSON path for graph nodes', () => {
    const source = { users: [{ name: 'Ada' }] };
    const { root } = buildGraph(source);
    expandAll(root);
    const userNode = root.rows[0].children?.[0];

    expect(root.sourceValue).toBe(source);
    expect(root.path).toEqual([]);
    expect(userNode?.sourceValue).toBe(source.users[0]);
    expect(userNode?.path).toEqual(['users', 0]);
  });

  it('keeps graph expansion state separate from the source JSON value', () => {
    const source = { outer: { inner: 1 } };
    const { root } = buildGraph(source);

    collapseAll(root);
    expandAll(root);

    expect(source).toEqual({ outer: { inner: 1 } });
  });
});

describe('toggleRow', () => {
  it('toggles open state', () => {
    const { root } = buildGraph({ items: [1, 2, 3] });
    const row = root.rows[0];
    expect(row.isExpanded).toBe(true);
    const flatRow = flattenRows(root)[0];
    expect(flatRow).toBeDefined();
    toggleRow(flatRow);
    expect(row.isExpanded).toBe(false);
    toggleRow(flatRow);
    expect(row.isExpanded).toBe(true);
  });

  it('returns false for rows without children', () => {
    const { root } = buildGraph({ name: 'test' });
    expect(toggleRow(flattenRows(root)[0])).toBe(false);
  });

  it('materializes deeper child nodes only when expanded', () => {
    const { root } = buildGraph({ outer: { inner: { value: true } } });
    const outerRow = root.rows[0];
    const outerNode = outerRow.children?.[0];
    const innerRow = outerNode?.rows[0];

    expect(root.rows[0].children).toHaveLength(1);
    expect(outerRow.isExpanded).toBe(true);
    expect(innerRow?.isExpanded).toBe(false);
    expect(innerRow?.children).toBeUndefined();

    if (!outerNode || !innerRow) throw new Error('Expected initial graph level.');
    toggleRow({ row: innerRow, node: outerNode, rowIndex: 0, path: ['outer', 'inner'] });

    expect(innerRow.children).toHaveLength(1);
    expect(flattenRows(root).map(({ row }) => row.key)).toEqual([
      'outer',
      'inner',
      'value',
    ]);
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
