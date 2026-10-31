/**
 * Graph data model for JSON Inspector.
 * Converts parsed JSON values into a renderable node tree.
 */

/** A single row inside a graph card (node) */
export interface Row {
  /** Display key with colon, e.g. "name: " or "" for root/array items */
  k: string;
  /** Display value text or summary like "[3 items]" */
  t: string;
  /** Child nodes (only for object/array valued properties) */
  kids?: GraphNode[];
  /** Whether children are expanded (default true) */
  open?: boolean;
}

/** A node in the graph - represents an object, array, or primitive pill */
export interface GraphNode {
  /** Rows displayed inside this card */
  rows: Row[];
  /** Whether this is a primitive pill node (small, no card border) */
  pill: boolean;
  /** Layout coordinates (set by layout pass) */
  x: number;
  y: number;
  /** Computed width and height */
  w: number;
  h: number;
  /** Depth in the tree (for coloring) */
  d: number;
}

/** Result of building a graph from a JSON value */
export interface BuildResult {
  root: GraphNode;
  nodeCount: number;
}

/** Constants for sizing */
const ROW_H = 26;
const PAD_X = 14;
const PAD_Y = 10;
const CHAR_W = 7.9; // monospace char width estimate
const MIN_NODE_W = 120;
const MAX_TEXT_LEN = 60;

/** Estimate text width for monospace font */
function textWidth(s: string): number {
  return Math.min(s.length, MAX_TEXT_LEN) * CHAR_W;
}

/** Truncate text if too long */
function truncate(s: string, max: number = MAX_TEXT_LEN): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

/** Format a primitive value for display */
function formatPrimitive(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return `"${truncate(v)}"`;
  return truncate(String(v));
}

/** Summarize an object or array for inline display */
function summarize(v: unknown): string {
  if (Array.isArray(v)) {
    return `[${v.length} item${v.length !== 1 ? 's' : ''}]`;
  }
  if (v !== null && typeof v === 'object') {
    const keys = Object.keys(v);
    return `{${keys.length} key${keys.length !== 1 ? 's' : ''}}`;
  }
  return formatPrimitive(v);
}

/** Check if a value is a primitive (not object/array) */
function isPrimitive(v: unknown): boolean {
  return v === null || typeof v !== 'object';
}

interface BuildContext {
  nodeCount: number;
}

/**
 * Build child nodes from a value.
 * Returns an array of GraphNodes for object/array children.
 */
function kidsOf(value: unknown, depth: number, context: BuildContext): GraphNode[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isPrimitive(item)) {
        return makePillNode(item, depth, context);
      }
      return makeObjectNode(item, depth, context);
    });
  }
  if (value !== null && typeof value === 'object') {
    return [makeObjectNode(value as Record<string, unknown>, depth, context)];
  }
  return [];
}

/** Create a pill node for a primitive array item */
function makePillNode(value: unknown, depth: number, context: BuildContext): GraphNode {
  context.nodeCount++;
  const t = formatPrimitive(value);
  return {
    rows: [{ k: '', t }],
    pill: true,
    x: 0, y: 0,
    w: textWidth(t) + PAD_X * 2,
    h: ROW_H + PAD_Y,
    d: depth,
  };
}

/** Create an object/array card node */
function makeObjectNode(obj: unknown, depth: number, context: BuildContext): GraphNode {
  context.nodeCount++;
  const rows: Row[] = [];
  let maxTextW = 0;

  if (Array.isArray(obj)) {
    // Array: each item is a row
    obj.forEach((item, i) => {
      const k = `${i}: `;
      if (isPrimitive(item)) {
        const t = formatPrimitive(item);
        rows.push({ k, t });
        maxTextW = Math.max(maxTextW, textWidth(k + t));
      } else {
        const t = summarize(item);
        const kids = kidsOf(item, depth + 1, context);
        rows.push({ k, t, kids, open: true });
        maxTextW = Math.max(maxTextW, textWidth(k + t));
      }
    });
  } else if (obj !== null && typeof obj === 'object') {
    // Object: each key-value pair is a row
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const k = `${key}: `;
      if (isPrimitive(val)) {
        const t = formatPrimitive(val);
        rows.push({ k, t });
        maxTextW = Math.max(maxTextW, textWidth(k + t));
      } else {
        const t = summarize(val);
        const kids = kidsOf(val, depth + 1, context);
        rows.push({ k, t, kids, open: true });
        maxTextW = Math.max(maxTextW, textWidth(k + t));
      }
    }
  }

  const w = Math.max(MIN_NODE_W, maxTextW + PAD_X * 2);
  const h = rows.length * ROW_H + PAD_Y * 2;

  return {
    rows,
    pill: false,
    x: 0, y: 0,
    w, h,
    d: depth,
  };
}

/**
 * Build the complete graph from a parsed JSON value.
 * Returns the root node and total node count.
 */
export function buildGraph(value: unknown): BuildResult {
  const context: BuildContext = { nodeCount: 0 };
  let root: GraphNode;

  if (isPrimitive(value)) {
    root = makePillNode(value, 0, context);
  } else {
    root = makeObjectNode(value, 0, context);
  }

  return { root, nodeCount: context.nodeCount };
}

/**
 * Collect all rows from the tree in a flat array (for event delegation).
 * Each entry includes the row and its parent node.
 */
export interface FlatRow {
  row: Row;
  node: GraphNode;
  rowIndex: number; // index within the node
}

export function flattenRows(root: GraphNode): FlatRow[] {
  const result: FlatRow[] = [];

  function walk(node: GraphNode) {
    node.rows.forEach((row, i) => {
      result.push({ row, node, rowIndex: i });
      if (row.kids && row.open) {
        row.kids.forEach(walk);
      }
    });
  }

  walk(root);
  return result;
}

/**
 * Toggle the open/closed state of a row's children.
 */
export function toggleRow(row: Row): boolean {
  if (!row.kids) return false;
  row.open = !row.open;
  return true;
}

/**
 * Collapse all rows in the tree.
 */
export function collapseAll(root: GraphNode): void {
  function walk(node: GraphNode) {
    for (const row of node.rows) {
      if (row.kids) {
        row.open = false;
        row.kids.forEach(walk);
      }
    }
  }
  walk(root);
}

/**
 * Expand all rows in the tree.
 */
export function expandAll(root: GraphNode): void {
  function walk(node: GraphNode) {
    for (const row of node.rows) {
      if (row.kids) {
        row.open = true;
        row.kids.forEach(walk);
      }
    }
  }
  walk(root);
}
