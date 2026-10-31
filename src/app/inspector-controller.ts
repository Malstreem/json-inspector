import { parseJson } from '../json/parse';
import { buildGraph, collapseAll, expandAll, flattenRows, type FlatRow, type GraphNode } from '../graph/model';
import { searchNodes } from '../graph/search';

export interface GraphViewPort {
  render(root: GraphNode, highlightIndices: Set<number>): void;
  clear(): void;
  fitToView(root: GraphNode): void;
  centerOnNode(node: GraphNode): void;
}

export interface InspectorStatus {
  onNodeCount: (count: number) => void;
  onParseTime: (milliseconds: number) => void;
  onError: (message: string | null) => void;
}

export class InspectorController {
  private root: GraphNode | null = null;
  private flatRows: FlatRow[] = [];
  private matches: number[] = [];
  private matchIndex = 0;
  private searchQuery = '';
  private readonly graphView: GraphViewPort;
  private readonly status: InspectorStatus;

  constructor(
    graphView: GraphViewPort,
    status: InspectorStatus
  ) {
    this.graphView = graphView;
    this.status = status;
  }

  setDocument(source: string): void {
    if (!source.trim()) {
      this.clearGraph();
      this.status.onError(null);
      return;
    }

    const startedAt = performance.now();
    const result = parseJson(source);
    const parseTime = performance.now() - startedAt;

    if (!result.ok) {
      this.clearGraph();
      this.status.onError(result.error);
      return;
    }

    const { root, nodeCount } = buildGraph(result.value);
    this.root = root;
    this.status.onError(null);
    this.status.onNodeCount(nodeCount);
    this.status.onParseTime(parseTime);
    this.refresh();
  }

  formatDocument(source: string): string | null {
    const result = parseJson(source);
    if (!result.ok) {
      this.clearGraph();
      this.status.onError(result.error);
      return null;
    }

    this.status.onError(null);
    return JSON.stringify(result.value, null, 2);
  }

  search(query: string): void {
    this.searchQuery = query;
    this.matchIndex = 0;
    if (!this.root) {
      this.matches = [];
      return;
    }

    this.refresh();
    this.centerOnCurrentMatch();
  }

  nextSearchMatch(query: string): void {
    if (query !== this.searchQuery) {
      this.search(query);
      return;
    }

    if (this.matches.length === 0) return;
    this.matchIndex = (this.matchIndex + 1) % this.matches.length;
    this.centerOnCurrentMatch();
  }

  collapseAll(): void {
    if (!this.root) return;
    collapseAll(this.root);
    this.refresh();
  }

  expandAll(): void {
    if (!this.root) return;
    expandAll(this.root);
    this.refresh();
    this.graphView.fitToView(this.root);
  }

  fitToView(): void {
    if (this.root) this.graphView.fitToView(this.root);
  }

  refresh(): void {
    if (!this.root) return;

    this.flatRows = flattenRows(this.root);
    this.matches = searchNodes(this.flatRows, this.searchQuery);
    this.matchIndex = this.matches.length
      ? this.matchIndex % this.matches.length
      : 0;
    this.graphView.render(this.root, new Set(this.matches));
  }

  getRoot(): GraphNode | null {
    return this.root;
  }

  private clearGraph(): void {
    this.root = null;
    this.flatRows = [];
    this.matches = [];
    this.matchIndex = 0;
    this.status.onNodeCount(0);
    this.graphView.clear();
  }

  private centerOnCurrentMatch(): void {
    const rowIndex = this.matches[this.matchIndex];
    if (rowIndex === undefined) return;

    const row = this.flatRows[rowIndex];
    if (row) this.graphView.centerOnNode(row.node);
  }
}
