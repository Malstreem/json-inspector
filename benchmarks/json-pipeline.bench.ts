import { bench, describe } from 'vitest';
import {
  flattenRows,
  expandAll,
  buildGraph,
} from '../src/graph/projection';
import { layoutNode } from '../src/graph/layout';
import { renderGraph } from '../src/graph/render';
import { parseJson } from '../src/json/parse';
import { createJsonFixtures } from './fixtures';

describe('JSON pipeline baseline', () => {
  for (const fixture of createJsonFixtures()) {
    const sourceBytes = new TextEncoder().encode(fixture.source).byteLength;
    const parsed = parseJson(fixture.source);
    if (!parsed.ok) {
      throw new Error(`Invalid generated ${fixture.name} benchmark fixture: ${parsed.error}`);
    }

    const graph = buildGraph(parsed.value);
    const flatRows = flattenRows(graph.root);
    layoutNode(graph.root, 0, 0);
    const fullGraph = buildGraph(parsed.value);
    expandAll(fullGraph.root);
    const fullFlatRows = flattenRows(fullGraph.root);
    layoutNode(fullGraph.root, 0, 0);
    const viewport = {
      minX: 0,
      minY: 0,
      maxX: 1600,
      maxY: 900,
      width: 1600,
      height: 900,
    };

    describe(`${fixture.name}: ${fixture.recordCount} records, ${sourceBytes} bytes`, () => {
      bench('parse JSON', () => {
        parseJson(fixture.source);
      });

      bench('build initial graph model', () => {
        buildGraph(parsed.value);
      });

      bench('build and expand full graph', () => {
        const expandedGraph = buildGraph(parsed.value);
        expandAll(expandedGraph.root);
      });

      bench('flatten initial rows', () => {
        flattenRows(graph.root);
      });

      bench('flatten full rows', () => {
        flattenRows(fullGraph.root);
      });

      bench('layout initial graph', () => {
        layoutNode(graph.root, 0, 0);
      });

      bench('layout full graph', () => {
        layoutNode(fullGraph.root, 0, 0);
      });

      bench('generate initial SVG', () => {
        renderGraph(graph.root, new Set(), flatRows);
      });

      bench('generate full SVG', () => {
        renderGraph(fullGraph.root, new Set(), fullFlatRows);
      });

      bench('generate full viewport SVG', () => {
        renderGraph(fullGraph.root, new Set(), fullFlatRows, viewport);
      });
    });
  }
});
