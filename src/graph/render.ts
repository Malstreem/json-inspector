/**
 * SVG renderer for the JSON graph.
 * Builds an SVG string from the laid-out node tree.
 */
import type { GraphNode, Row, FlatRow } from './model';
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
 * @param flatIndex - Starting index in the flat row array (for data-r attributes)
 * @param highlightSet - Set of flat row indices to highlight (search results)
 * @returns SVG string and the number of flat rows consumed
 */
function renderNode(
  node: GraphNode,
  flatIndex: number,
  highlightSet: Set<number>
): { svg: string; rowsConsumed: number } {
  let svg = '';
  let consumed = 0;

  if (node.pill) {
    // Pill node: small rounded rect with text
    const isHighlighted = highlightSet.has(flatIndex);
    const fill = isHighlighted ? HIGHLIGHT_COLOR : PILL_BG;
    const textFill = isHighlighted ? '#000' : TEXT_COLOR;
    svg += `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="13" ry="13" fill="${fill}" stroke="${STROKE_COLOR}" stroke-width="1.5"/>`;
    svg += `<text x="${node.x + node.w / 2}" y="${node.y + node.h / 2 + 5}" text-anchor="middle" fill="${textFill}" font-size="13" font-family="'JetBrains Mono', monospace">${esc(node.rows[0].t)}</text>`;
    consumed = 1;
    return { svg, rowsConsumed: consumed };
  }

  // Card node: rounded rect with rows
  const fillColor = DEPTH_COLORS[node.d % DEPTH_COLORS.length];
  svg += `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="${BORDER_R}" ry="${BORDER_R}" fill="${fillColor}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_W}"/>`;

  // Render each row
  node.rows.forEach((row, ri) => {
    const ry = node.y + PAD_Y + ri * ROW_H;
    const tx = node.x + PAD_X;
    const rowFlatIdx = flatIndex + consumed;
    consumed++;

    const isHighlighted = highlightSet.has(rowFlatIdx);

    // Highlight background
    if (isHighlighted) {
      svg += `<rect x="${node.x + 2}" y="${ry - 3}" width="${node.w - 4}" height="${ROW_H}" rx="4" fill="${HIGHLIGHT_COLOR}" opacity="0.3"/>`;
    }

    // Expand/collapse indicator for rows with children
    if (row.kids) {
      const arrow = row.open ? '▾' : '▸';
      svg += `<text x="${tx - 2}" y="${ry + 16}" fill="${TEXT_COLOR}" font-size="12" font-family="'JetBrains Mono', monospace" data-r="${rowFlatIdx}" style="cursor:pointer">${arrow}</text>`;
    }

    // Key text
    const keyOffset = row.kids ? 12 : 0;
    if (row.k) {
      svg += `<text x="${tx + keyOffset}" y="${ry + 16}" fill="${KEY_COLOR}" font-size="13" font-family="'JetBrains Mono', monospace" data-r="${rowFlatIdx}" style="cursor:${row.kids ? 'pointer' : 'default'}">`;
      svg += `<tspan fill="${KEY_COLOR}">${esc(row.k)}</tspan>`;
      svg += `<tspan fill="${TEXT_COLOR}">${esc(row.t)}</tspan>`;
      svg += `</text>`;
    } else {
      svg += `<text x="${tx + keyOffset}" y="${ry + 16}" fill="${TEXT_COLOR}" font-size="13" font-family="'JetBrains Mono', monospace" data-r="${rowFlatIdx}">${esc(row.t)}</text>`;
    }

    // Connection dot for rows with children
    if (row.kids && row.open) {
      const dotX = node.x + node.w;
      const dotY = ry + ROW_H / 2 + 3;
      svg += `<circle cx="${dotX}" cy="${dotY}" r="4" fill="${STROKE_COLOR}"/>`;
    }
  });

  return { svg, rowsConsumed: consumed };
}

/**
 * Render edge (cubic Bézier curve) from a parent row to a child node.
 */
function renderEdge(
  parentNode: GraphNode,
  rowIndex: number,
  childNode: GraphNode
): string {
  const x1 = parentNode.x + parentNode.w;
  const y1 = parentNode.y + PAD_Y + rowIndex * ROW_H + ROW_H / 2 + 3;
  const x2 = childNode.x;
  const y2 = childNode.y + childNode.h / 2;

  const cpOffset = Math.min(Math.abs(x2 - x1) * 0.5, 80);
  const cp1x = x1 + cpOffset;
  const cp2x = x2 - cpOffset;

  return `<path d="M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}" fill="none" stroke="${EDGE_COLOR}" stroke-width="1.5" opacity="0.6"/>`;
}

/**
 * Render the entire graph as an SVG string.
 * Returns the SVG inner content (no <svg> wrapper - caller adds that with viewBox).
 */
export function renderGraph(
  root: GraphNode,
  highlightIndices: Set<number> = new Set()
): { svg: string; flatRows: FlatRow[] } {
  const flatRows = flattenRows(root);
  let edgesSvg = '';
  let nodesSvg = '';

  // Render function that walks the tree
  let currentFlatIdx = 0;

  function walkRender(node: GraphNode) {
    const startIdx = currentFlatIdx;
    const result = renderNode(node, startIdx, highlightIndices);
    nodesSvg += result.svg;
    currentFlatIdx += result.rowsConsumed;

    // Render edges and recurse into children
    node.rows.forEach((row, ri) => {
      if (row.kids && row.open) {
        for (const kid of row.kids) {
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
