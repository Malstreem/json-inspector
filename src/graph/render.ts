/**
 * SVG renderer for the JSON graph.
 * Builds an SVG string from the laid-out node tree.
 */
import type { GraphNode, FlatRow, Row } from './model';
import { flattenRows } from './model';

const ROW_H = 26;
const PAD_X = 14;
const PAD_Y = 10;
const BORDER_R = 10; // border radius
const STROKE_W = 3;  // border width

/** Depth-based fill colors (dark theme, matching reference) */
const DEPTH_COLORS = [
  '#3d2b1f', // brown
  '#1a1a40', // indigo
  '#0d3b2e', // dark green
  '#3b0d0d', // maroon
  '#3b3b0d', // olive
  '#2d0d3b', // purple
  '#0d1f3b', // navy
];

const STROKE_COLOR = '#c8b896'; // tan/beige border
const TEXT_COLOR = '#e0ddd5';   // light text
const KEY_COLOR = '#a0a0a0';    // dimmer key text
const PILL_BG = '#2a2a3d';
const EDGE_COLOR = '#555';
const HIGHLIGHT_COLOR = '#ffd700'; // search highlight

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
  highlightSet: Set<number>
): string {
  let svg = '';

  if (node.isPill) {
    // Pill node: small rounded rect with text
    const rowIndex = rowIndices.get(node.rows[0]);
    const isHighlighted = rowIndex !== undefined && highlightSet.has(rowIndex);
    const fill = isHighlighted ? HIGHLIGHT_COLOR : PILL_BG;
    const textFill = isHighlighted ? '#000' : TEXT_COLOR;
    svg += `<g data-row-index="${rowIndex ?? -1}">`;
    svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="13" ry="13" fill="${fill}" stroke="${STROKE_COLOR}" stroke-width="1.5"/>`;
    svg += `<text x="${node.x + node.width / 2}" y="${node.y + node.height / 2 + 5}" text-anchor="middle" fill="${textFill}" font-size="13" font-family="'JetBrains Mono', monospace">${esc(node.rows[0].value)}</text>`;
    svg += '</g>';
    return svg;
  }

  // Card node: rounded rect with rows
  const fillColor = DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
  svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${BORDER_R}" ry="${BORDER_R}" fill="${fillColor}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_W}"/>`;

  // Render each row
  node.rows.forEach((row, ri) => {
    const ry = node.y + PAD_Y + ri * ROW_H;
    const tx = node.x + PAD_X;
    const rowFlatIndex = rowIndices.get(row) ?? -1;
    const isHighlighted = highlightSet.has(rowFlatIndex);

    if (row.children) {
      svg += `<g data-row-index="${rowFlatIndex}" role="button" tabindex="0" aria-expanded="${Boolean(row.isExpanded)}" aria-label="${esc(`${row.isExpanded ? 'Collapse' : 'Expand'} ${formatRowLabel(row)}`)}" style="cursor:pointer">`;
    } else {
      svg += `<g data-row-index="${rowFlatIndex}">`;
    }

    // Highlight background
    if (isHighlighted) {
      svg += `<rect x="${node.x + 2}" y="${ry - 3}" width="${node.width - 4}" height="${ROW_H}" rx="4" fill="${HIGHLIGHT_COLOR}" opacity="0.3"/>`;
    }

    // Expand/collapse indicator for rows with children
    if (row.children) {
      const arrow = row.isExpanded ? '▾' : '▸';
      svg += `<text x="${tx - 2}" y="${ry + 16}" fill="${TEXT_COLOR}" font-size="12" font-family="'JetBrains Mono', monospace">${arrow}</text>`;
    }

    // Key text
    const keyOffset = row.children ? 12 : 0;
    if (row.key !== null) {
      svg += `<text x="${tx + keyOffset}" y="${ry + 16}" fill="${KEY_COLOR}" font-size="13" font-family="'JetBrains Mono', monospace">`;
      svg += `<tspan fill="${KEY_COLOR}">${esc(`${row.key}: `)}</tspan>`;
      svg += `<tspan fill="${TEXT_COLOR}">${esc(row.value)}</tspan>`;
      svg += `</text>`;
    } else {
      svg += `<text x="${tx + keyOffset}" y="${ry + 16}" fill="${TEXT_COLOR}" font-size="13" font-family="'JetBrains Mono', monospace">${esc(row.value)}</text>`;
    }

    // Connection dot for rows with children
    if (row.children && row.isExpanded) {
      const dotX = node.x + node.width;
      const dotY = ry + ROW_H / 2 + 3;
      svg += `<circle cx="${dotX}" cy="${dotY}" r="4" fill="${STROKE_COLOR}"/>`;
    }
    svg += '</g>';
  });

  return svg;
}

/**
 * Render edge (cubic Bézier curve) from a parent row to a child node.
 */
function renderEdge(
  parentNode: GraphNode,
  rowIndex: number,
  childNode: GraphNode
): string {
  const x1 = parentNode.x + parentNode.width;
  const y1 = parentNode.y + PAD_Y + rowIndex * ROW_H + ROW_H / 2 + 3;
  const x2 = childNode.x;
  const y2 = childNode.y + childNode.height / 2;

  const cpOffset = Math.min(Math.abs(x2 - x1) * 0.5, 80);
  const cp1x = x1 + cpOffset;
  const cp2x = x2 - cpOffset;

  return `<path d="M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}" fill="none" stroke="${EDGE_COLOR}" stroke-width="1.5" opacity="0.6"/>`;
}

function formatRowLabel(row: Row): string {
  return row.key === null ? row.value : `${row.key}: ${row.value}`;
}

/**
 * Render the entire graph as an SVG string.
 * Returns the SVG inner content (no <svg> wrapper - caller adds that with viewBox).
 */
export function renderGraph(
  root: GraphNode,
  highlightIndices: Set<number> = new Set(),
  flatRows: FlatRow[] = flattenRows(root)
): { svg: string; flatRows: FlatRow[] } {
  const rowIndices = new Map(flatRows.map(({ row }, index) => [row, index]));
  let edgesSvg = '';
  let nodesSvg = '';

  // Render function that walks the tree
  function walkRender(node: GraphNode) {
    nodesSvg += renderNode(node, rowIndices, highlightIndices);

    // Render edges and recurse into children
    node.rows.forEach((row, ri) => {
      if (row.children && row.isExpanded) {
        for (const kid of row.children) {
          edgesSvg += renderEdge(node, ri, kid);
          walkRender(kid);
        }
      }
    });
  }

  walkRender(root);

  return {
    svg: edgesSvg + nodesSvg, // edges behind nodes
    flatRows,
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
