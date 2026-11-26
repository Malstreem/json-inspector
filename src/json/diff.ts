/**
 * Structural JSON diffing utility.
 */
import type { JsonPath, JsonValue } from './types';
import { formatJsonPath } from '../graph/copy';

export type DiffKind = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  path: JsonPath;
  formattedPath: string;
  kind: DiffKind;
  before?: JsonValue;
  after?: JsonValue;
}

function isPlainObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Compute structural differences between two JSON values.
 */
export function diffJson(
  a: JsonValue,
  b: JsonValue,
  path: JsonPath = []
): DiffEntry[] {
  if (Object.is(a, b)) return [];

  if (Array.isArray(a) && Array.isArray(b)) {
    const entries: DiffEntry[] = [];
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const nextPath = [...path, i];
      if (i >= a.length) {
        entries.push({
          path: nextPath,
          formattedPath: formatJsonPath(nextPath),
          kind: 'added',
          after: b[i],
        });
      } else if (i >= b.length) {
        entries.push({
          path: nextPath,
          formattedPath: formatJsonPath(nextPath),
          kind: 'removed',
          before: a[i],
        });
      } else {
        entries.push(...diffJson(a[i], b[i], nextPath));
      }
    }
    return entries;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const entries: DiffEntry[] = [];
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const nextPath = [...path, key];
      const inA = Object.prototype.hasOwnProperty.call(a, key);
      const inB = Object.prototype.hasOwnProperty.call(b, key);
      if (!inA && inB) {
        entries.push({
          path: nextPath,
          formattedPath: formatJsonPath(nextPath),
          kind: 'added',
          after: b[key],
        });
      } else if (inA && !inB) {
        entries.push({
          path: nextPath,
          formattedPath: formatJsonPath(nextPath),
          kind: 'removed',
          before: a[key],
        });
      } else {
        entries.push(...diffJson(a[key], b[key], nextPath));
      }
    }
    return entries;
  }

  return [
    {
      path,
      formattedPath: formatJsonPath(path),
      kind: 'changed',
      before: a,
      after: b,
    },
  ];
}
