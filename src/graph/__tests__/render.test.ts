import { describe, expect, it } from 'vitest';
import { buildGraph, flattenRows } from '../projection';
import { layoutNode } from '../layout';
import {
  createGraphRenderIndex,
  renderGraph,
} from '../render';

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

  it('renders focusable graph nodes with copy shortcut guidance', () => {
    const { root } = buildGraph({ branch: { leaf: true } });
    layoutNode(root, 0, 0);

    const { svg, nodes } = renderGraph(root);

    expect(nodes).toHaveLength(2);
    expect(svg).toContain('data-node-index="0" class="graph-node" role="group" tabindex="0"');
    expect(svg).toContain('aria-keyshortcuts="Control+C Control+Alt+C Meta+C Meta+Alt+C"');
    expect(svg).toContain('aria-label="JSON node at $.branch"');
  });

  it('matches highlights against the same flat row traversal', () => {
    const { root } = buildGraph({ branch: { value: 'match' }, sibling: 1 });
    layoutNode(root, 0, 0);
    const rows = flattenRows(root);
    const matchIndex = rows.findIndex(({ row }) => row.value.includes('match'));

    const { svg } = renderGraph(root, new Set([matchIndex]), rows);

    expect(svg).toContain('fill="#ffd700" opacity="0.3"');
  });

  it('renders only viewport nodes while keeping canonical node indexes', () => {
    const { root } = buildGraph({
      near: { value: 1 },
      far: { value: 2 },
    });
    const nearNode = root.rows[0].children?.[0];
    const farNode = root.rows[1].children?.[0];
    if (!nearNode || !farNode) throw new Error('Expected expanded root children.');

    root.x = 0;
    root.y = 0;
    nearNode.x = 500;
    nearNode.y = 0;
    farNode.x = 1000;
    farNode.y = 0;

    const graphIndex = createGraphRenderIndex(root);
    const { svg, nodes } = renderGraph(root, new Set(), flattenRows(root), {
      minX: 500,
      minY: 0,
      maxX: 700,
      maxY: 200,
      width: 200,
      height: 200,
    }, graphIndex);

    expect(nodes).toEqual([root, nearNode, farNode]);
    expect(svg).toContain('data-node-index="1"');
    expect(svg).not.toContain('data-node-index="0"');
    expect(svg).not.toContain('data-node-index="2"');
    expect([...svg.matchAll(/<path /g)]).toHaveLength(2);
  });

  it('preserves row and node indexes when rendering a viewport subset', () => {
    const { root } = buildGraph({
      near: { value: 1 },
      far: { value: 2 },
    });
    const nearNode = root.rows[0].children?.[0];
    const farNode = root.rows[1].children?.[0];
    if (!nearNode || !farNode) throw new Error('Expected expanded root children.');
    root.x = 0;
    root.y = 0;
    nearNode.x = 500;
    nearNode.y = 0;
    farNode.x = 1000;
    farNode.y = 1000;
    const flatRows = flattenRows(root);
    const graphIndex = createGraphRenderIndex(root);

    const { svg, nodes: allNodes } = renderGraph(
      root,
      new Set(),
      flatRows,
      {
        minX: 500,
        minY: 0,
        maxX: 700,
        maxY: 200,
        width: 200,
        height: 200,
      },
      graphIndex
    );

    expect(allNodes).toEqual([root, nearNode, farNode]);
    expect(svg).toContain('data-node-index="1"');
    expect(svg).not.toContain('data-node-index="2"');
    expect(svg).toContain('data-row-index="1"');
    expect(svg).not.toContain('data-row-index="3"');
  });
});
