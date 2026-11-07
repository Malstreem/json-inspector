import type { BoundingBox } from './layout';

export interface SpatialEntry<T> {
  bounds: BoundingBox;
  value: T;
}

interface SpatialBranch<T> {
  bounds: BoundingBox;
  entries?: SpatialEntry<T>[];
  left?: SpatialBranch<T>;
  right?: SpatialBranch<T>;
}

const MAX_LEAF_ENTRIES = 12;

function unionBounds(entries: SpatialEntry<unknown>[]): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { bounds } of entries) {
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function buildBranch<T>(entries: SpatialEntry<T>[]): SpatialBranch<T> {
  const bounds = unionBounds(entries);
  if (entries.length <= MAX_LEAF_ENTRIES) return { bounds, entries };

  const splitOnX = bounds.width >= bounds.height;
  const sortedEntries = [...entries].sort((a, b) => {
    const centerA = splitOnX
      ? a.bounds.minX + a.bounds.maxX
      : a.bounds.minY + a.bounds.maxY;
    const centerB = splitOnX
      ? b.bounds.minX + b.bounds.maxX
      : b.bounds.minY + b.bounds.maxY;
    return centerA - centerB;
  });
  const midpoint = Math.floor(sortedEntries.length / 2);
  const leftEntries = sortedEntries.slice(0, midpoint);
  const rightEntries = sortedEntries.slice(midpoint);

  return {
    bounds,
    left: buildBranch(leftEntries),
    right: buildBranch(rightEntries),
  };
}

function intersects(a: BoundingBox, b: BoundingBox): boolean {
  return a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY;
}

export class SpatialIndex<T> {
  private readonly root: SpatialBranch<T> | null;

  constructor(entries: SpatialEntry<T>[]) {
    this.root = entries.length ? buildBranch(entries) : null;
  }

  query(bounds: BoundingBox): T[] {
    if (!this.root) return [];
    const matches: T[] = [];
    const pending = [this.root];

    while (pending.length) {
      const branch = pending.pop();
      if (!branch || !intersects(branch.bounds, bounds)) continue;
      if (branch.entries) {
        for (const entry of branch.entries) {
          if (intersects(entry.bounds, bounds)) matches.push(entry.value);
        }
      } else {
        if (branch.left) pending.push(branch.left);
        if (branch.right) pending.push(branch.right);
      }
    }

    return matches;
  }
}
