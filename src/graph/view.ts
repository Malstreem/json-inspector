import { GraphInteractions } from './interactions';
import { GraphCopyControls } from './copy-controls';
import type { FlatRow, GraphNode } from './model';
import { computeBounds, layoutNode } from './layout';
import { renderGraph } from './render';

export class GraphView {
  private readonly group: SVGGElement;
  private readonly interactions: GraphInteractions;
  private readonly copyControls: GraphCopyControls;

  constructor(
    svg: SVGSVGElement,
    group: SVGGElement,
    onRowToggle: () => void,
    onCopyStatus: (message: string, isError: boolean) => void
  ) {
    this.group = group;
    this.interactions = new GraphInteractions(svg, group, onRowToggle);
    this.copyControls = new GraphCopyControls(svg, onCopyStatus);
  }

  render(root: GraphNode, highlightIndices: Set<number>, flatRows: FlatRow[]): void {
    layoutNode(root, 0, 0, 0);
    const { svg } = renderGraph(root, highlightIndices, flatRows);
    this.group.innerHTML = svg;
    this.interactions.setFlatRows(flatRows);
    this.copyControls.setFlatRows(flatRows);
  }

  clear(): void {
    this.group.innerHTML = '';
    this.interactions.setFlatRows([]);
    this.copyControls.setFlatRows([]);
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
