import {
  collapseAll,
  expandAll,
  flattenRows,
  type GraphNode,
  type FlatRow,
} from '../graph/projection';
import { searchNodes } from '../graph/search';
import {
  JsonProcessingWorker,
  type JsonProcessingPort,
} from '../workers/json-processing-client';

export interface GraphViewPort {
  render(root: GraphNode, highlightIndices: Set<number>, flatRows: FlatRow[]): void;
  clear(): void;
  fitToView(root: GraphNode): void;
  centerOnNode(node: GraphNode): void;
}

export interface InspectorStatus {
  onNodeCount: (count: number) => void;
  onProcessingTime: (milliseconds: number) => void;
  onError: (message: string | null) => void;
}

export class InspectorController {
  private root: GraphNode | null = null;
  private flatRows: FlatRow[] = [];
  private matches: number[] = [];
  private matchIndex = 0;
  private searchQuery = '';
  private documentRevision = 0;
  private readonly graphView: GraphViewPort;
  private readonly status: InspectorStatus;
  private readonly processing: JsonProcessingPort;

  constructor(
    graphView: GraphViewPort,
    status: InspectorStatus,
    processing: JsonProcessingPort = new JsonProcessingWorker()
  ) {
    this.graphView = graphView;
    this.status = status;
    this.processing = processing;
  }

  async setDocument(source: string): Promise<void> {
    const revision = ++this.documentRevision;
    if (!source.trim()) {
      this.clearGraph();
      this.status.onError(null);
      return;
    }

    try {
      const result = await this.processing.inspect(source);
      if (revision !== this.documentRevision) return;
      this.status.onProcessingTime(result.elapsedMs);
      if (!result.ok) {
        this.clearGraph();
        this.status.onError(result.error);
        return;
      }

      const { root, nodeCount } = result.graph;
      this.root = root;
      this.status.onError(null);
      this.status.onNodeCount(nodeCount);
      this.refresh();
    } catch (error) {
      if (revision !== this.documentRevision) return;
      this.clearGraph();
      this.status.onError(this.processingError(error));
    }
  }

  async formatDocument(source: string): Promise<string | null> {
    const revision = ++this.documentRevision;
    try {
      const result = await this.processing.format(source);
      if (revision !== this.documentRevision) return null;
      this.status.onProcessingTime(result.elapsedMs);
      if (!result.ok) {
        this.clearGraph();
        this.status.onError(result.error);
        return null;
      }

      this.status.onError(null);
      return result.formatted;
    } catch (error) {
      if (revision !== this.documentRevision) return null;
      this.clearGraph();
      this.status.onError(this.processingError(error));
      return null;
    }
  }

  invalidatePendingRequests(): void {
    this.documentRevision++;
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
    this.graphView.render(this.root, new Set(this.matches), this.flatRows);
  }

  getRoot(): GraphNode | null {
    return this.root;
  }

  destroy(): void {
    this.documentRevision++;
    this.processing.destroy();
  }

  private clearGraph(): void {
    this.root = null;
    this.flatRows = [];
    this.matches = [];
    this.matchIndex = 0;
    this.status.onNodeCount(0);
    this.status.onProcessingTime(0);
    this.graphView.clear();
  }

  private processingError(error: unknown): string {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    return `Unable to process JSON in the background${detail}`;
  }

  private centerOnCurrentMatch(): void {
    const rowIndex = this.matches[this.matchIndex];
    if (rowIndex === undefined) return;

    const row = this.flatRows[rowIndex];
    if (row) this.graphView.centerOnNode(row.node);
  }
}
