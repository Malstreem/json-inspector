export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export type JsonPathSegment = string | number;
export type JsonPath = readonly JsonPathSegment[];

export function computeJsonDepth(val: JsonValue, current = 0): number {
  if (val === null || typeof val !== 'object') return current;
  let max = current + 1;
  if (Array.isArray(val)) {
    for (const item of val) {
      max = Math.max(max, computeJsonDepth(item, current + 1));
    }
  } else {
    for (const v of Object.values(val)) {
      max = Math.max(max, computeJsonDepth(v, current + 1));
    }
  }
  return max;
}
