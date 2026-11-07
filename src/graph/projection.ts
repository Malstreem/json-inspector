/**
 * Projects JSON values into the graph view's interactive node structure.
 */
import type { JsonValue, JsonPath } from '../json/types';

/** A single row inside a graph card (node) */
export interface Row {
  key: string | null;
  sourceValue: JsonValue;
  /** Display value or a summary such as "[3 items]". */
  value: string;
  pathSegment?: string | number;
  children?: GraphNode[];
  isExpanded?: boolean;
}

/** A node in the graph - represents an object, array, or primitive pill */
export interface GraphNode {
  /** Rows displayed inside this card */
  rows: Row[];
  sourceValue: JsonValue;
  path: JsonPath;
  /** Whether this is a primitive pill node (small, no card border) */
  isPill: boolean;
  /** Layout coordinates, assigned by the layout pass. */
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

/** Graph-specific projection of a parsed JSON document */
export interface GraphProjection {
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
export const MAX_GRAPH_DEPTH = 100;

export class GraphDepthError extends Error {
  constructor() {
    super(`JSON nesting exceeds the supported graph depth of ${MAX_GRAPH_DEPTH}.`);
    this.name = 'GraphDepthError';
  }
}

/** Estimate text width for monospace font */
function textWidth(s: string): number {
  return s.length * CHAR_W;
}

/** Truncate text if too long */
function truncate(s: string, max: number = MAX_TEXT_LEN): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

/** Format a primitive value for display */
function formatPrimitive(v: JsonValue): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${truncate(v)}"`;
  return truncate(String(v));
}

/** Summarize an object or array for inline display */
function summarize(v: JsonValue): string {
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
function isPrimitive(v: JsonValue): boolean {
  return v === null || typeof v !== 'object';
}

interface BuildContext {
  nodeCount: number;
}

/**
 * Build child nodes for a nested object or array value.
 * Returns an array of GraphNodes for object/array children.
 */
function createChildren(
  value: JsonValue,
  depth: number,
  context: BuildContext,
  path: JsonPath
): GraphNode[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const childPath = [...path, index];
      return isPrimitive(item)
        ? createPillNode(item, depth, context, childPath)
        : createObjectNode(item, depth, context, childPath);
    });
  }
  if (value !== null && typeof value === 'object') {
    return [createObjectNode(value, depth, context, path)];
  }
  return [];
}

/** Create a pill node for a primitive array item */
function assertSupportedDepth(depth: number): void {
  if (depth > MAX_GRAPH_DEPTH) {
    throw new GraphDepthError();
  }
}

function createPillNode(
  value: JsonValue,
  depth: number,
  context: BuildContext,
  path: JsonPath
): GraphNode {
  assertSupportedDepth(depth);
  context.nodeCount++;
  const formattedValue = formatPrimitive(value);
  return {
    rows: [{ key: null, sourceValue: value, value: formattedValue }],
    sourceValue: value,
    path,
    isPill: true,
    x: 0, y: 0,
    width: textWidth(formattedValue) + PAD_X * 2,
    height: ROW_H + PAD_Y,
    depth,
  };
}

/** Create an object/array card node */
function createObjectNode(
  objectValue: JsonValue,
  depth: number,
  context: BuildContext,
  path: JsonPath
): GraphNode {
  assertSupportedDepth(depth);
  context.nodeCount++;
  const rows: Row[] = [];
  let maxTextWidth = 0;

  if (Array.isArray(objectValue)) {
    // Array: each item is a row
    objectValue.forEach((item, i) => {
      const key = String(i);
      if (isPrimitive(item)) {
        const value = formatPrimitive(item);
        rows.push({ key, pathSegment: i, sourceValue: item, value });
        maxTextWidth = Math.max(maxTextWidth, textWidth(`${key}: ${value}`));
      } else {
        const value = summarize(item);
        const children = createChildren(item, depth + 1, context, [...path, i]);
        rows.push({ key, pathSegment: i, sourceValue: item, value, children, isExpanded: true });
        maxTextWidth = Math.max(maxTextWidth, textWidth(`${key}: ${value}`));
      }
    });
  } else if (objectValue !== null && typeof objectValue === 'object') {
    // Object: each key-value pair is a row
    for (const [key, childValue] of Object.entries(objectValue)) {
      if (isPrimitive(childValue)) {
        const value = formatPrimitive(childValue);
        rows.push({ key, pathSegment: key, sourceValue: childValue, value });
        maxTextWidth = Math.max(maxTextWidth, textWidth(`${key}: ${value}`));
      } else {
        const value = summarize(childValue);
        const children = createChildren(childValue, depth + 1, context, [...path, key]);
        rows.push({ key, pathSegment: key, sourceValue: childValue, value, children, isExpanded: true });
        maxTextWidth = Math.max(maxTextWidth, textWidth(`${key}: ${value}`));
      }
    }
  }

  const width = Math.max(MIN_NODE_W, maxTextWidth + PAD_X * 2);
  const height = rows.length * ROW_H + PAD_Y * 2;

  return {
    rows,
    sourceValue: objectValue,
    path,
    isPill: false,
    x: 0, y: 0,
    width,
    height,
    depth,
  };
}

/**
 * Build a graph-specific projection from a parsed JSON value.
 * Returns its root node and total node count.
 */
export function buildGraph(value: JsonValue): GraphProjection {
  const context: BuildContext = { nodeCount: 0 };
  let root: GraphNode;

  if (isPrimitive(value)) {
    root = createPillNode(value, 0, context, []);
  } else {
    root = createObjectNode(value, 0, context, []);
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
  path: JsonPath;
}

export function flattenRows(root: GraphNode): FlatRow[] {
  const result: FlatRow[] = [];

  function walk(node: GraphNode): void {
    node.rows.forEach((row, i) => {
      const path = row.pathSegment === undefined
        ? node.path
        : [...node.path, row.pathSegment];
      result.push({ row, node, rowIndex: i, path });
      if (row.children && row.isExpanded) {
        row.children.forEach(walk);
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
  if (!row.children) return false;
  row.isExpanded = !row.isExpanded;
  return true;
}

/**
 * Collapse all rows in the tree.
 */
export function collapseAll(root: GraphNode): void {
  function walk(node: GraphNode) {
    for (const row of node.rows) {
      if (row.children) {
        row.isExpanded = false;
        row.children.forEach(walk);
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
      if (row.children) {
        row.isExpanded = true;
        row.children.forEach(walk);
      }
    }
  }
  walk(root);
}
