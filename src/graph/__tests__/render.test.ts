import { describe, expect, it } from 'vitest';
import { buildGraph, flattenRows } from '../model';
import { layoutNode } from '../layout';
import { renderGraph } from '../render';

describe('renderGraph', () => {
  it('uses the canonical visible row indices for expandable SVG controls', () => {
    const { root } = buildGraph({
      first: { inner: 1 },
      second: { leaf: 2 },
    });
    layoutNode(root, 0, 0);

    const { svg, flatRows } = renderGraph(root);
    const controls = [...svg.matchAll(/<g data-row-index="(\d+)"[^>]*aria-label="([^"]*)"/g)];
    const controlsByIndex = new Map(
      controls.map(([, index, label]) => [Number(index), label])
    );

    expect(flatRows.map(({ row }) => row.key)).toEqual([
      'first',
      'inner',
      'second',
      'leaf',
    ]);
    expect(controlsByIndex.get(0)).toContain('first:');
    expect(controlsByIndex.get(2)).toContain('second:');
    expect(controlsByIndex.has(1)).toBe(false);
    expect(controlsByIndex.has(3)).toBe(false);
  });

  it('marks expandable rows as keyboard-operable controls', () => {
    const { root } = buildGraph({ branch: { leaf: true } });
    layoutNode(root, 0, 0);

    const { svg } = renderGraph(root);

    expect(svg).toContain('role="button" tabindex="0" aria-expanded="true"');
  });

  it('matches highlights against the same flat row traversal', () => {
    const { root } = buildGraph({ branch: { value: 'match' }, sibling: 1 });
    layoutNode(root, 0, 0);
    const rows = flattenRows(root);
    const matchIndex = rows.findIndex(({ row }) => row.value.includes('match'));

    const { svg } = renderGraph(root, new Set([matchIndex]), rows);

    expect(svg).toContain('fill="#ffd700" opacity="0.3"');
  });
});
