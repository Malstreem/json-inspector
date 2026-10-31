import { computeBounds, layoutNode } from '../graph/layout';
import { exportSVG, renderGraph } from '../graph/render';
import type { GraphNode } from '../graph/model';

export function downloadGraphSvg(root: GraphNode): void {
  layoutNode(root, 0, 0, 0);
  const bounds = computeBounds(root);
  const { svg } = renderGraph(root);
  const blob = new Blob(
    [exportSVG(svg, bounds.width, bounds.height)],
    { type: 'image/svg+xml' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'json-inspector-graph.svg';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
