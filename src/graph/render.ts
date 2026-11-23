/**
 * SVG renderer for the JSON graph.
 * Builds an SVG string from the laid-out node tree.
 */
import {
  flattenRows,
  isExpandable,
  type FlatRow,
  type GraphNode,
  type Row,
} from './projection';
import { formatJsonPath } from './copy';
import type { BoundingBox } from './layout';
import { SpatialIndex } from './spatial-index';

const ROW_H = 26;
const PAD_X = 14;
const PAD_Y = 10;
const BORDER_R = 10; // border radius
const STROKE_W = 1.5;  // border width

/** Depth-based fill colors (modern refined dark tones) */
const DEPTH_COLORS = [
  '#1e1c2e', // Deep elevated violet
  '#1a1f36', // Deep elevated indigo/navy
  '#16242b', // Deep elevated teal/cyan
  '#18261e', // Deep elevated emerald
  '#272118', // Deep elevated amber
  '#2b1824', // Deep elevated rose
  '#22182b', // Deep elevated purple
];

/** Vibrant top accent stripe per depth */
const DEPTH_ACCENTS = [
  '#818cf8', // Indigo
  '#a78bfa', // Violet
  '#38bdf8', // Sky
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f472b6', // Pink
  '#2dd4bf', // Teal
];

const STROKE_COLOR = 'rgba(255, 255, 255, 0.12)';
const PILL_BG = '#28253d';
const EDGE_COLOR = 'rgba(148, 163, 184, 0.4)';
const HIGHLIGHT_COLOR = '#ffd700'; // search highlight

// Syntax highlighting colors for graph row values
const KEY_COLOR = '#f8fafc';    // Crisp bright white/slate for keys
const STR_COLOR = '#34d399';    // Emerald green for strings
const NUM_COLOR = '#fbbf24';    // Amber for numbers
const BOOL_COLOR = '#f472b6';   // Pink for booleans
const NULL_COLOR = '#94a3b8';   // Slate for null
const BADGE_COLOR = '#818cf8';  // Indigo for [3 items] or {4 keys}

function getValueColor(val: unknown, isExp: boolean): string {
  if (isExp) return BADGE_COLOR;
  if (val === null) return NULL_COLOR;
  if (typeof val === 'string') return STR_COLOR;
  if (typeof val === 'number') return NUM_COLOR;
  if (typeof val === 'boolean') return BOOL_COLOR;
  return '#e2e8f0';
}

/** Escape HTML entities */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render a single node (card) as SVG string.
 * @param node - The graph node to render
 * @param rowIndices - Canonical visible-row index for each row in the graph
 * @param highlightSet - Visible row indices to highlight as search results
 * @returns SVG markup for the node
 */
function renderNode(
  node: GraphNode,
  rowIndices: Map<Row, number>,
  highlightSet: Set<number>,
  nodeIndex: number,
  isFilterMode: boolean = false
): string {
  let svg = '';
  const hasMatch = node.rows.some((r) => {
    const idx = rowIndices.get(r);
    return idx !== undefined && highlightSet.has(idx);
  });
  const isDimmed = isFilterMode && highlightSet.size > 0 && !hasMatch;
  const dimmedClass = isDimmed ? ' is-dimmed' : '';

  if (node.isPill) {
    // Pill node: small rounded rect with text
    const rowIndex = rowIndices.get(node.rows[0]);
    const isHighlighted = rowIndex !== undefined && highlightSet.has(rowIndex);
    const fill = isHighlighted ? HIGHLIGHT_COLOR : PILL_BG;
    const textFill = isHighlighted ? '#000' : getValueColor(node.rows[0].sourceValue, false);
    svg += `<g data-node-index="${nodeIndex}" class="graph-node${dimmedClass}" role="group" tabindex="0" aria-keyshortcuts="Control+C Control+Alt+C Meta+C Meta+Alt+C" aria-label="JSON node at ${esc(formatJsonPath(node.path))}">`;
    svg += `<g data-row-index="${rowIndex ?? -1}">`;
    svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="13" ry="13" fill="${fill}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_W}"/>`;
    svg += `<text x="${node.x + node.width / 2}" y="${node.y + node.height / 2 + 5}" text-anchor="middle" fill="${textFill}" font-size="13" font-family="'JetBrains Mono', monospace">${esc(node.rows[0].value)}</text>`;
    svg += '</g>';
    svg += '</g>';
    return svg;
  }

  // Card node: rounded rect with rows
  const fillColor = DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
  const accentColor = DEPTH_ACCENTS[node.depth % DEPTH_ACCENTS.length];
  svg += `<g data-node-index="${nodeIndex}" class="graph-node${dimmedClass}" role="group" tabindex="0" aria-keyshortcuts="Control+C Control+Alt+C Meta+C Meta+Alt+C" aria-label="JSON node at ${esc(formatJsonPath(node.path))}">`;
  svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${BORDER_R}" ry="${BORDER_R}" fill="${fillColor}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_W}"/>`;
  // Sleek top accent line
  svg += `<rect x="${node.x + 1}" y="${node.y + 1}" width="${node.width - 2}" height="3" rx="1.5" ry="1.5" fill="${accentColor}" opacity="0.85"/>`;

  // Render each row
  node.rows.forEach((row, ri) => {
    const ry = node.y + PAD_Y + ri * ROW_H;
    const tx = node.x + PAD_X;
    const rowFlatIndex = rowIndices.get(row) ?? -1;
    const isHighlighted = highlightSet.has(rowFlatIndex);
    const valColor = getValueColor(row.sourceValue, isExpandable(row));

    if (isExpandable(row)) {
      svg += `<g data-row-index="${rowFlatIndex}" class="graph-row" role="button" tabindex="0" aria-expanded="${Boolean(row.isExpanded)}" aria-label="${esc(`${row.isExpanded ? 'Collapse' : 'Expand'} ${formatRowLabel(row)}`)}" style="cursor:pointer">`;
    } else {
      svg += `<g data-row-index="${rowFlatIndex}" class="graph-row">`;
    }

    // Row hover background rect
    svg += `<rect class="row-hover-bg" x="${node.x + 2}" y="${ry - 3}" width="${node.width - 4}" height="${ROW_H}" rx="4" fill="transparent"/>`;

    // Highlight background
    if (isHighlighted) {
      svg += `<rect x="${node.x + 2}" y="${ry - 3}" width="${node.width - 4}" height="${ROW_H}" rx="4" fill="${HIGHLIGHT_COLOR}" opacity="0.3"/>`;
    }

    // Expand/collapse indicator for rows with children
    if (isExpandable(row)) {
      const arrow = row.isExpanded ? '▾' : '▸';
      const arrowColor = row.isExpanded ? accentColor : '#94a3b8';
      svg += `<text class="expand-arrow" x="${tx - 2}" y="${ry + 16}" fill="${arrowColor}" font-size="12" font-family="'JetBrains Mono', monospace">${arrow}</text>`;
    }

    // Key text
    const keyOffset = isExpandable(row) ? 12 : 0;
    if (row.key !== null) {
      svg += `<text x="${tx + keyOffset}" y="${ry + 16}" font-size="13" font-family="'JetBrains Mono', monospace">`;
      svg += `<tspan fill="${KEY_COLOR}">${esc(`${row.key}: `)}</tspan>`;
      svg += `<tspan fill="${valColor}">${esc(row.value)}</tspan>`;
      svg += `</text>`;
    } else {
      svg += `<text x="${tx + keyOffset}" y="${ry + 16}" fill="${valColor}" font-size="13" font-family="'JetBrains Mono', monospace">${esc(row.value)}</text>`;
    }

    // Connection dot for rows with children
    if (isExpandable(row) && row.isExpanded) {
      const dotX = node.x + node.width;
      const dotY = ry + ROW_H / 2 + 3;
      svg += `<circle class="connect-dot" cx="${dotX}" cy="${dotY}" r="3.5" fill="${accentColor}"/>`;
    }
    svg += '</g>';
  });

  svg += '</g>';
  return svg;
}

/**
 * Render edge (cubic Bézier curve) from a parent row to a child node.
 */
function renderEdge(
  parentNode: GraphNode,
  rowIndex: number,
  childNode: GraphNode,
  isDimmed: boolean = false
): string {
  const x1 = parentNode.x + parentNode.width;
  const y1 = parentNode.y + PAD_Y + rowIndex * ROW_H + ROW_H / 2 + 3;
  const x2 = childNode.x;
  const y2 = childNode.y + childNode.height / 2;

  const cpOffset = Math.min(Math.abs(x2 - x1) * 0.5, 80);
  const cp1x = x1 + cpOffset;
  const cp2x = x2 - cpOffset;
  const dimClass = isDimmed ? ' is-dimmed' : '';

  return `<path class="graph-edge${dimClass}" d="M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}" fill="none" stroke="${EDGE_COLOR}" stroke-width="1.5"/>`;
}

function formatRowLabel(row: Row): string {
  return row.key === null ? row.value : `${row.key}: ${row.value}`;
}

interface GraphEdge {
  parent: GraphNode;
  rowIndex: number;
  child: GraphNode;
}

export interface GraphRenderIndex {
  nodes: GraphNode[];
  nodeIndices: Map<GraphNode, number>;
  rowIndices: Map<Row, number>;
  edges: GraphEdge[];
  nodeSpatialIndex: SpatialIndex<GraphNode>;
  edgeSpatialIndex: SpatialIndex<GraphEdge>;
}

function getNodeBounds(node: GraphNode): BoundingBox {
  return {
    minX: node.x,
    minY: node.y,
    maxX: node.x + node.width,
    maxY: node.y + node.height,
    width: node.width,
    height: node.height,
  };
}

function getEdgeBounds(edge: GraphEdge): BoundingBox {
  const { parent, rowIndex, child } = edge;
  const startX = parent.x + parent.width;
  const startY = parent.y + PAD_Y + rowIndex * ROW_H + ROW_H / 2 + 3;
  const endX = child.x;
  const endY = child.y + child.height / 2;
  const controlOffset = Math.min(Math.abs(endX - startX) * 0.5, 80);
  const control1X = startX + controlOffset;
  const control2X = endX - controlOffset;
  const minX = Math.min(startX, endX, control1X, control2X);
  const minY = Math.min(startY, endY);
  const maxX = Math.max(startX, endX, control1X, control2X);
  const maxY = Math.max(startY, endY);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function createGraphRenderIndex(root: GraphNode): GraphRenderIndex {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const rowIndices = new Map<Row, number>();

  function collect(node: GraphNode): void {
    nodes.push(node);
    node.rows.forEach((row, rowIndex) => {
      rowIndices.set(row, rowIndices.size);
      if (!isExpandable(row) || !row.isExpanded) return;
      for (const child of row.children ?? []) {
        edges.push({ parent: node, rowIndex, child });
        collect(child);
      }
    });
  }
  collect(root);

  return {
    nodes,
    nodeIndices: new Map(nodes.map((node, index) => [node, index])),
    rowIndices,
    edges,
    nodeSpatialIndex: new SpatialIndex(
      nodes.map((node) => ({ bounds: getNodeBounds(node), value: node }))
    ),
    edgeSpatialIndex: new SpatialIndex(
      edges.map((edge) => ({ bounds: getEdgeBounds(edge), value: edge }))
    ),
  };
}

/**
 * Render the entire graph as an SVG string.
 * Returns the SVG inner content (no <svg> wrapper - caller adds that with viewBox).
 */
export function renderGraph(
  root: GraphNode,
  highlightIndices: Set<number> = new Set(),
  flatRows: FlatRow[] = flattenRows(root),
  viewport?: BoundingBox,
  graphIndex: GraphRenderIndex = createGraphRenderIndex(root),
  isFilterMode: boolean = false
): { svg: string; flatRows: FlatRow[]; nodes: GraphNode[] } {
  const rowIndices = graphIndex.rowIndices;
  const nodes = viewport
    ? graphIndex.nodeSpatialIndex.query(viewport)
        .sort((a, b) => graphIndex.nodeIndices.get(a)! - graphIndex.nodeIndices.get(b)!)
    : graphIndex.nodes;
  const edges = viewport
    ? graphIndex.edgeSpatialIndex.query(viewport)
    : graphIndex.edges;
  const edgesSvg = edges
    .map(({ parent, rowIndex, child }) => {
      const parentHasMatch = parent.rows.some((r) => {
        const idx = rowIndices.get(r);
        return idx !== undefined && highlightSet.has(idx);
      });
      const childHasMatch = child.rows.some((r) => {
        const idx = rowIndices.get(r);
        return idx !== undefined && highlightSet.has(idx);
      });
      const edgeDimmed = isFilterMode && highlightSet.size > 0 && (!parentHasMatch || !childHasMatch);
      return renderEdge(parent, rowIndex, child, edgeDimmed);
    })
    .join('');
  const nodesSvg = nodes
    .map((node) => renderNode(
      node,
      rowIndices,
      highlightIndices,
      graphIndex.nodeIndices.get(node)!,
      isFilterMode
    ))
    .join('');

  return {
    svg: edgesSvg + nodesSvg, // edges behind nodes
    flatRows,
    nodes: graphIndex.nodes,
  };
}

/**
 * Export the graph as a standalone SVG file string.
 */
export function exportSVG(
  svgContent: string,
  width: number,
  height: number,
  padding: number = 40
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width + padding * 2}" 
     height="${height + padding * 2}" 
     viewBox="${-padding} ${-padding} ${width + padding * 2} ${height + padding * 2}"
     style="background:#1a1625">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
  </style>
  ${svgContent}
</svg>`;
}
