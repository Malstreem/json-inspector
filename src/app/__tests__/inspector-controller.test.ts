import { describe, expect, it } from 'vitest';
import { InspectorController, type GraphViewPort } from '../inspector-controller';
import type { GraphNode } from '../../graph/model';

class FakeGraphView implements GraphViewPort {
  renderedRoot: GraphNode | null = null;
  highlights = new Set<number>();
  cleared = false;
  centeredNode: GraphNode | null = null;

  render(root: GraphNode, highlightIndices: Set<number>): void {
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

describe('InspectorController', () => {
  it('updates the graph and status from valid JSON', () => {
    const graphView = new FakeGraphView();
    const nodeCounts: number[] = [];
    const errors: (string | null)[] = [];
    const controller = new InspectorController(graphView, {
      onNodeCount: (count) => nodeCounts.push(count),
      onParseTime: () => {},
      onError: (message) => errors.push(message),
    });

    controller.setDocument('{"user":{"name":"Ada"}}');

    expect(controller.getRoot()).not.toBeNull();
    expect(graphView.renderedRoot).toBe(controller.getRoot());
    expect(nodeCounts).toEqual([2]);
    expect(errors).toEqual([null]);
  });

  it('clears graph state when JSON is invalid', () => {
    const graphView = new FakeGraphView();
    const nodeCounts: number[] = [];
    const errors: (string | null)[] = [];
    const controller = new InspectorController(graphView, {
      onNodeCount: (count) => nodeCounts.push(count),
      onParseTime: () => {},
      onError: (message) => errors.push(message),
    });

    controller.setDocument('{"valid":true}');
    controller.setDocument('{"invalid":}');

    expect(controller.getRoot()).toBeNull();
    expect(graphView.cleared).toBe(true);
    expect(nodeCounts).toEqual([1, 0]);
    expect(errors[1]).toBeTruthy();
  });

  it('searches and advances through matching visible rows', () => {
    const graphView = new FakeGraphView();
    const controller = new InspectorController(graphView, {
      onNodeCount: () => {},
      onParseTime: () => {},
      onError: () => {},
    });
    controller.setDocument('{"name":"Ada","nickname":"Ada"}');

    controller.search('ada');
    expect(graphView.highlights).toEqual(new Set([0, 1]));

    controller.nextSearchMatch('ada');
    expect(graphView.centeredNode).toBe(controller.getRoot());
  });
});
