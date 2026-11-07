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
export const MAX_INITIAL_ARRAY_ITEMS = 100;

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

function shouldExpandInitially(value: JsonValue, depth: number): boolean {
  return depth === 0 &&
    (!Array.isArray(value) || value.length <= MAX_INITIAL_ARRAY_ITEMS);
}

/** Check if a value is a primitive (not object/array) */
function isPrimitive(v: JsonValue): boolean {
  return v === null || typeof v !== 'object';
}

/**
 * Build the immediate graph nodes represented by a nested object or array.
 */
function createChildren(
  value: JsonValue,
  depth: number,
  path: JsonPath
): GraphNode[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const childPath = [...path, index];
      return isPrimitive(item)
        ? createPillNode(item, depth, childPath)
        : createObjectNode(item, depth, childPath);
    });
  }
  if (value !== null && typeof value === 'object') {
    return [createObjectNode(value, depth, path)];
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
  path: JsonPath
): GraphNode {
  assertSupportedDepth(depth);
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
  path: JsonPath
): GraphNode {
  assertSupportedDepth(depth);
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
        const isExpanded = shouldExpandInitially(objectValue, depth);
        const row: Row = {
          key,
          pathSegment: i,
          sourceValue: item,
          value,
          isExpanded,
        };
        if (isExpanded) {
          row.children = createChildren(item, depth + 1, [...path, i]);
        }
        rows.push(row);
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
        const isExpanded = shouldExpandInitially(childValue, depth);
        const row: Row = {
          key,
          pathSegment: key,
          sourceValue: childValue,
          value,
          isExpanded,
        };
        if (isExpanded) {
          row.children = createChildren(childValue, depth + 1, [...path, key]);
        }
        rows.push(row);
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
  const isLargeRootArray = Array.isArray(value) &&
    value.length > MAX_INITIAL_ARRAY_ITEMS;
  const nodeCount = isLargeRootArray && Array.isArray(value)
    ? value.reduce<number>(
        (count, item) => count + countGraphNodes(item, 1),
        1
      )
    : countGraphNodes(value, 0);
  let root: GraphNode;

  if (isPrimitive(value)) {
    root = createPillNode(value, 0, []);
  } else if (Array.isArray(value) && value.length > MAX_INITIAL_ARRAY_ITEMS) {
    const summary = summarize(value);
    root = {
      rows: [{
        key: null,
        sourceValue: value,
        value: summary,
        isExpanded: false,
      }],
      sourceValue: value,
      path: [],
      isPill: false,
      x: 0,
      y: 0,
      width: Math.max(MIN_NODE_W, textWidth(summary) + PAD_X * 2),
      height: ROW_H + PAD_Y * 2,
      depth: 0,
    };
  } else {
    root = createObjectNode(value, 0, []);
  }

  return { root, nodeCount };
}

function countGraphNodes(value: JsonValue, depth: number): number {
  assertSupportedDepth(depth);
  if (isPrimitive(value)) return 1;

  let nodeCount = 1;
  if (Array.isArray(value)) {
    for (const childValue of value) {
      if (!isPrimitive(childValue)) {
        nodeCount += countChildNodes(childValue, depth + 1);
      }
    }
  } else if (value !== null && typeof value === 'object') {
    for (const childValue of Object.values(value)) {
      if (!isPrimitive(childValue)) {
        nodeCount += countChildNodes(childValue, depth + 1);
      }
    }
  }
  return nodeCount;
}

function countChildNodes(value: JsonValue, depth: number): number {
  if (!Array.isArray(value)) return countGraphNodes(value, depth);
  return value.reduce<number>(
    (count, item) => count + countGraphNodes(item, depth),
    0
  );
}

function getRowPath(row: Row, node: GraphNode): JsonPath {
  return row.pathSegment === undefined
    ? node.path
    : [...node.path, row.pathSegment];
}

function materializeChildren(row: Row, node: GraphNode): void {
  if (row.children) return;
  row.children = createChildren(
    row.sourceValue,
    node.depth + 1,
    getRowPath(row, node)
  );
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
      if (isExpandable(row) && row.isExpanded) {
        materializeChildren(row, node);
        row.children?.forEach(walk);
      }
    });
  }

  walk(root);
  return result;
}

/**
 * Toggle the open/closed state of a row's children.
 */
export function isExpandable(row: Row): boolean {
  return !isPrimitive(row.sourceValue);
}

export function toggleRow(flatRow: FlatRow): boolean {
  const { row, node } = flatRow;
  if (!isExpandable(row)) return false;
  if (!row.isExpanded) materializeChildren(row, node);
  row.isExpanded = !row.isExpanded;
  return true;
}

/**
 * Collapse all rows in the tree.
 */
export function collapseAll(root: GraphNode): void {
  function walk(node: GraphNode) {
    for (const row of node.rows) {
      if (isExpandable(row)) {
        row.isExpanded = false;
        row.children?.forEach(walk);
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
      if (isExpandable(row)) {
        materializeChildren(row, node);
        row.isExpanded = true;
        row.children?.forEach(walk);
      }
    }
  }
  walk(root);
}
