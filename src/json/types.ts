export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export type JsonPathSegment = string | number;
export type JsonPath = readonly JsonPathSegment[];
