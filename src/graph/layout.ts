/**
 * Tidy-tree layout algorithm for the JSON graph.
 * Positions nodes left-to-right with parent → child connections.
 */
import type { GraphNode, Row } from './model';

const GAP_X = 60;  // horizontal gap between parent and children
const GAP_Y = 16;  // vertical gap between sibling nodes

/**
 * Layout a node and all its visible children.
 * @param node - The node to layout
 * @param x - Left x position for this node
 * @param y0 - Top y position available
 * @param depth - Current depth (for coloring)
 * @returns The total height consumed by this subtree
 */
export function layoutNode(node: GraphNode, x: number, y0: number, depth: number = 0): number {
  node.x = x;
  node.d = depth;

  // Collect all visible child nodes from open rows
  const allKids: { row: Row; rowIndex: number; kids: GraphNode[] }[] = [];
  node.rows.forEach((row, ri) => {
    if (row.kids && row.open) {
      allKids.push({ row, rowIndex: ri, kids: row.kids });
    }
  });

  if (allKids.length === 0) {
    // Leaf node: position at y0
    node.y = y0;
    return node.h;
  }

  // Layout all children
  const childX = x + node.w + GAP_X;
  let cy = y0;

  const allChildNodes: GraphNode[] = [];
  for (const group of allKids) {
    for (const kid of group.kids) {
      const kidH = layoutNode(kid, childX, cy, depth + 1);
      allChildNodes.push(kid);
      cy += kidH + GAP_Y;
    }
  }

  // Remove trailing gap
  const childrenHeight = cy - y0 - GAP_Y;

  // Center parent vertically among its children
  const firstChild = allChildNodes[0];
  const lastChild = allChildNodes[allChildNodes.length - 1];
  const childMidY = (firstChild.y + lastChild.y + lastChild.h) / 2;
  node.y = childMidY - node.h / 2;

  // Ensure parent doesn't go above y0
  if (node.y < y0) {
    const shift = y0 - node.y;
    node.y = y0;
    // Shift all children down
    shiftSubtree(allChildNodes, shift);
  }

  return Math.max(node.h, childrenHeight + GAP_Y) + Math.max(0, node.y - y0);
}

/** Shift a set of nodes (and their descendants) vertically */
function shiftSubtree(nodes: GraphNode[], dy: number): void {
  for (const node of nodes) {
    shiftNode(node, dy);
  }
}

function shiftNode(node: GraphNode, dy: number): void {
  node.y += dy;
  for (const row of node.rows) {
    if (row.kids && row.open) {
      for (const kid of row.kids) {
        shiftNode(kid, dy);
      }
    }
  }
}

/**
 * Compute the bounding box of the entire laid-out tree.
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function computeBounds(root: GraphNode): BoundingBox {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  function walk(node: GraphNode) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.w);
    maxY = Math.max(maxY, node.y + node.h);

    for (const row of node.rows) {
      if (row.kids && row.open) {
        row.kids.forEach(walk);
      }
    }
  }

  walk(root);

  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
