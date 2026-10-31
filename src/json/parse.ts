export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function parseJson(source: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(source) as unknown };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
