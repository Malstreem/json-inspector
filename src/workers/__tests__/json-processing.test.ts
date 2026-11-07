import { describe, expect, it } from 'vitest';
import { MAX_GRAPH_DEPTH } from '../../graph/projection';
import { processJsonRequest } from '../json-processing';

describe('processJsonRequest', () => {
  it('parses valid JSON and creates a graph projection for inspection', () => {
    const response = processJsonRequest({
      requestId: 7,
      action: 'inspect',
      source: '{"user":{"name":"Ada"}}',
    });

    expect(response).toMatchObject({
      requestId: 7,
      action: 'inspect',
      result: {
        ok: true,
        graph: { nodeCount: 2 },
      },
    });
  });

  it('keeps the complete node count while deferring large array nodes', () => {
    const records = Array.from({ length: 101 }, (_, index) => ({ id: index }));
    const response = processJsonRequest({
      requestId: 11,
      action: 'inspect',
      source: JSON.stringify({ records }),
    });

    expect(response.action).toBe('inspect');
    if (response.action !== 'inspect' || !response.result.ok) {
      throw new Error('Expected successful graph inspection.');
    }

    expect(response.result.graph.nodeCount).toBe(102);
    expect(response.result.graph.root.rows[0].children).toBeUndefined();
  });

  it('returns parse errors without building a graph', () => {
    const response = processJsonRequest({
      requestId: 8,
      action: 'inspect',
      source: '{"broken":}',
    });

    expect(response).toMatchObject({
      requestId: 8,
      action: 'inspect',
      result: {
        ok: false,
        kind: 'invalid-json',
      },
    });
  });

  it('reports the existing graph-depth limit', () => {
    let source = 'null';
    for (let depth = 0; depth <= MAX_GRAPH_DEPTH + 1; depth++) {
      source = `{"child":${source}}`;
    }

    const response = processJsonRequest({
      requestId: 9,
      action: 'inspect',
      source,
    });

    expect(response).toMatchObject({
      requestId: 9,
      action: 'inspect',
      result: {
        ok: false,
        kind: 'depth',
      },
    });
  });

  it('formats valid JSON without constructing a graph', () => {
    const response = processJsonRequest({
      requestId: 10,
      action: 'format',
      source: '{"name":"Ada","age":37}',
    });

    expect(response).toMatchObject({
      requestId: 10,
      action: 'format',
      result: {
        ok: true,
        formatted: '{\n  "name": "Ada",\n  "age": 37\n}',
      },
    });
  });
});
