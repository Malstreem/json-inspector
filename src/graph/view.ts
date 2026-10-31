import { GraphInteractions } from './interactions';
import type { GraphNode } from './model';
import { computeBounds, layoutNode } from './layout';
import { renderGraph } from './render';

export class GraphView {
  private readonly group: SVGGElement;
  private readonly interactions: GraphInteractions;

  constructor(
    svg: SVGSVGElement,
    group: SVGGElement,
    onRowToggle: () => void
  ) {
    this.group = group;
    this.interactions = new GraphInteractions(svg, group, {
      onToggleRow: onRowToggle,
      onViewportChange: () => {},
    });
  }

  render(root: GraphNode, highlightIndices: Set<number>): void {
    layoutNode(root, 0, 0, 0);
    const { svg, flatRows } = renderGraph(root, highlightIndices);
    this.group.innerHTML = svg;
    this.interactions.setFlatRows(flatRows);
  }

  clear(): void {
    this.group.innerHTML = '';
    this.interactions.setFlatRows([]);
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
  }
}
