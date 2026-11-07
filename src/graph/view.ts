import { GraphInteractions } from './interactions';
import { GraphCopyControls } from './copy-controls';
import type { FlatRow, GraphNode } from './projection';
import { computeBounds, layoutNode } from './layout';
import {
  createGraphRenderIndex,
  renderGraph,
  type GraphRenderIndex,
} from './render';

export class GraphView {
  private readonly group: SVGGElement;
  private readonly interactions: GraphInteractions;
  private readonly copyControls: GraphCopyControls;
  private root: GraphNode | null = null;
  private highlightIndices = new Set<number>();
  private flatRows: FlatRow[] = [];
  private graphIndex: GraphRenderIndex | null = null;

  constructor(
    svg: SVGSVGElement,
    group: SVGGElement,
    onRowToggle: () => void,
    onCopyStatus: (message: string, isError: boolean) => void
  ) {
    this.group = group;
    this.interactions = new GraphInteractions(
      svg,
      group,
      onRowToggle,
      () => this.renderViewport()
    );
    this.copyControls = new GraphCopyControls(svg, onCopyStatus);
  }

  render(root: GraphNode, highlightIndices: Set<number>, flatRows: FlatRow[]): void {
    this.root = root;
    this.highlightIndices = highlightIndices;
    this.flatRows = flatRows;
    layoutNode(root, 0, 0, 0);
    this.graphIndex = createGraphRenderIndex(root);
    this.renderViewport(true);
  }

  private renderViewport(updateGraphControls = false): void {
    if (!this.root || !this.graphIndex) return;
    const { svg, nodes } = renderGraph(
      this.root,
      this.highlightIndices,
      this.flatRows,
      this.interactions.getVisibleBounds(),
      this.graphIndex
    );
    this.group.innerHTML = svg;
    if (updateGraphControls) {
      this.interactions.setFlatRows(this.flatRows);
      this.copyControls.setFlatRows(this.flatRows);
      this.copyControls.setNodes(nodes);
    }
  }

  clear(): void {
    this.root = null;
    this.highlightIndices = new Set();
    this.flatRows = [];
    this.graphIndex = null;
    this.group.innerHTML = '';
    this.interactions.setFlatRows([]);
    this.copyControls.setFlatRows([]);
    this.copyControls.setNodes([]);
  }

  fitToView(root: GraphNode): void {
    layoutNode(root, 0, 0, 0);
    this.interactions.fitToView(computeBounds(root));
  }

  centerOnNode(node: GraphNode): void {
    this.interactions.centerOnNode(node);
  }

  zoomIn(): void {
    this.interactions.zoomIn();
  }

  zoomOut(): void {
    this.interactions.zoomOut();
  }

  destroy(): void {
    this.interactions.destroy();
    this.copyControls.destroy();
  }
}
