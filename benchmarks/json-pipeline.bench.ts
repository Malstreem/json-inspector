import { bench, describe } from 'vitest';
import {
  flattenRows,
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

      bench('build graph model', () => {
        buildGraph(parsed.value);
      });

      bench('flatten visible rows', () => {
        flattenRows(graph.root);
      });

      bench('layout graph', () => {
        layoutNode(graph.root, 0, 0);
      });

      bench('generate SVG', () => {
        renderGraph(graph.root, new Set(), flatRows);
      });

      bench('generate viewport SVG', () => {
        renderGraph(graph.root, new Set(), flatRows, viewport);
      });
    });
  }
});
