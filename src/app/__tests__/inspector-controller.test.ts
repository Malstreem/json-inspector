import { describe, expect, it } from 'vitest';
import { InspectorController, type GraphViewPort } from '../inspector-controller';
import {
  MAX_GRAPH_DEPTH,
  buildGraph,
  type GraphNode,
  type FlatRow,
} from '../../graph/projection';
import type { JsonValue } from '../../json/types';
import { processJsonRequest } from '../../workers/json-processing';
import type {
  JsonFormattingResult,
  JsonProcessingResult,
} from '../../workers/json-processing.protocol';
import type {
  JsonProcessingPort,
} from '../../workers/json-processing-client';

class FakeGraphView implements GraphViewPort {
  renderedRoot: GraphNode | null = null;
  highlights = new Set<number>();
  cleared = false;
  centeredNode: GraphNode | null = null;

  render(root: GraphNode, highlightIndices: Set<number>, _flatRows: FlatRow[]): void {
    this.renderedRoot = root;
    this.highlights = highlightIndices;
  }

  clear(): void {
    this.renderedRoot = null;
    this.cleared = true;
  }

  fitToView(): void {}

  centerOnNode(node: GraphNode): void {
    this.centeredNode = node;
  }
}

class FakeJsonProcessing implements JsonProcessingPort {
  inspect(source: string): Promise<JsonProcessingResult> {
    const response = processJsonRequest({ requestId: 0, action: 'inspect', source });
    if (response.action !== 'inspect') {
      return Promise.reject(new Error('Unexpected fake inspection response.'));
    }
    return Promise.resolve(response.result);
  }

  format(source: string): Promise<JsonFormattingResult> {
    const response = processJsonRequest({ requestId: 0, action: 'format', source });
    if (response.action !== 'format') {
      return Promise.reject(new Error('Unexpected fake formatting response.'));
    }
    return Promise.resolve(response.result);
  }

  destroy(): void {}
}

describe('InspectorController', () => {
  it('updates the graph and status from valid JSON', async () => {
    const graphView = new FakeGraphView();
    const nodeCounts: number[] = [];
    const errors: (string | null)[] = [];
    const processingTimes: number[] = [];
    const controller = new InspectorController(graphView, {
      onNodeCount: (count) => nodeCounts.push(count),
      onProcessingTime: (time) => processingTimes.push(time),
      onError: (message) => errors.push(message),
    }, new FakeJsonProcessing());

    await controller.setDocument('{"user":{"name":"Ada"}}');

    expect(controller.getRoot()).not.toBeNull();
    expect(graphView.renderedRoot).toBe(controller.getRoot());
    expect(nodeCounts).toEqual([2]);
    expect(errors).toEqual([null]);
    expect(processingTimes).toHaveLength(1);
    expect(processingTimes[0]).toBeGreaterThanOrEqual(0);
  });

  it('clears graph state when JSON is invalid', async () => {
    const graphView = new FakeGraphView();
    const nodeCounts: number[] = [];
    const errors: (string | null)[] = [];
    const controller = new InspectorController(graphView, {
      onNodeCount: (count) => nodeCounts.push(count),
      onProcessingTime: () => {},
      onError: (message) => errors.push(message),
    }, new FakeJsonProcessing());

    await controller.setDocument('{"valid":true}');
    await controller.setDocument('{"invalid":}');

    expect(controller.getRoot()).toBeNull();
    expect(graphView.cleared).toBe(true);
    expect(nodeCounts).toEqual([1, 0]);
    expect(errors[1]).toBeTruthy();
  });

  it('reports input that exceeds the supported graph depth', async () => {
    let value: JsonValue = 'leaf';
    for (let depth = 0; depth <= MAX_GRAPH_DEPTH; depth++) {
      value = { child: value };
    }
    value = { child: value };

    const graphView = new FakeGraphView();
    const errors: (string | null)[] = [];
    const controller = new InspectorController(graphView, {
      onNodeCount: () => {},
      onProcessingTime: () => {},
      onError: (message) => errors.push(message),
    }, new FakeJsonProcessing());

    await controller.setDocument(JSON.stringify(value));

    expect(controller.getRoot()).toBeNull();
    expect(graphView.cleared).toBe(true);
    expect(errors.at(-1)).toContain('supported graph depth');
  });

  it('searches and advances through matching visible rows', async () => {
    const graphView = new FakeGraphView();
    const controller = new InspectorController(graphView, {
      onNodeCount: () => {},
      onProcessingTime: () => {},
      onError: () => {},
    }, new FakeJsonProcessing());
    await controller.setDocument('{"name":"Ada","nickname":"Ada"}');

    controller.search('ada');
    expect(graphView.highlights).toEqual(new Set([0, 1]));

    controller.nextSearchMatch('ada');
    expect(graphView.centeredNode).toBe(controller.getRoot());
  });

  it('ignores stale worker results after a newer document is requested', async () => {
    const graphView = new FakeGraphView();
    const staleResult: {
      resolve: (result: JsonProcessingResult) => void;
    } = { resolve: () => {} };
    const processing = new FakeJsonProcessing();
    processing.inspect = (source) => source === 'stale'
      ? new Promise((resolve) => {
          staleResult.resolve = resolve;
        })
      : new FakeJsonProcessing().inspect(source);
    const controller = new InspectorController(graphView, {
      onNodeCount: () => {},
      onProcessingTime: () => {},
      onError: () => {},
    }, processing);

    const staleDocument = controller.setDocument('stale');
    await controller.setDocument('{"current":true}');
    const currentRoot = controller.getRoot();
    staleResult.resolve({
      ok: true,
      graph: buildGraph({ outdated: true }),
      elapsedMs: 1,
    });
    await staleDocument;

    expect(controller.getRoot()).toBe(currentRoot);
    expect(controller.getRoot()?.rows[0].key).toBe('current');
  });

  it('discards an in-flight result immediately when the editor changes', async () => {
    const graphView = new FakeGraphView();
    let resolveStale: (result: JsonProcessingResult) => void = () => {};
    const processing = new FakeJsonProcessing();
    processing.inspect = () => new Promise((resolve) => {
      resolveStale = resolve;
    });
    const controller = new InspectorController(graphView, {
      onNodeCount: () => {},
      onProcessingTime: () => {},
      onError: () => {},
    }, processing);

    const pending = controller.setDocument('{"older":true}');
    controller.invalidatePendingRequests();
    resolveStale({
      ok: true,
      graph: buildGraph({ older: true }),
      elapsedMs: 1,
    });
    await pending;

    expect(controller.getRoot()).toBeNull();
    expect(graphView.renderedRoot).toBeNull();
  });

  it('formats JSON asynchronously and reports worker failures', async () => {
    const errors: (string | null)[] = [];
    const processing = new FakeJsonProcessing();
    const controller = new InspectorController(new FakeGraphView(), {
      onNodeCount: () => {},
      onProcessingTime: () => {},
      onError: (message) => errors.push(message),
    }, processing);

    const formatted = await controller.formatDocument('{"name":"Ada","age":37}');
    expect(formatted).toBe('{\n  "name": "Ada",\n  "age": 37\n}');

    const invalid = await controller.formatDocument('{"broken":}');
    expect(invalid).toBeNull();
    expect(errors.at(-1)).toContain('JSON');

    processing.format = () => Promise.reject(new Error('worker unavailable'));
    const failed = await controller.formatDocument('{"name":"Ada"}');
    expect(failed).toBeNull();
    expect(errors.at(-1)).toContain('worker unavailable');
  });
});
