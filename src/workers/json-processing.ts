import { GraphDepthError, buildGraph } from '../graph/projection';
import { parseJson } from '../json/parse';
import type {
  JsonProcessingRequest,
  JsonProcessingResponse,
} from './json-processing.protocol';

export function processJsonRequest(request: JsonProcessingRequest): JsonProcessingResponse {
  const startedAt = performance.now();
  const parsed = parseJson(request.source);

  if (!parsed.ok) {
    const result = {
      ok: false as const,
      kind: 'invalid-json' as const,
      error: parsed.error,
      elapsedMs: performance.now() - startedAt,
    };
    return { requestId: request.requestId, action: request.action, result };
  }

  if (request.action === 'format') {
    return {
      requestId: request.requestId,
      action: 'format',
      result: {
        ok: true,
        formatted: JSON.stringify(parsed.value, null, 2),
        elapsedMs: performance.now() - startedAt,
      },
    };
  }

  try {
    return {
      requestId: request.requestId,
      action: 'inspect',
      result: {
        ok: true,
        graph: buildGraph(parsed.value),
        elapsedMs: performance.now() - startedAt,
      },
    };
  } catch (error) {
    if (!(error instanceof GraphDepthError)) throw error;

    return {
      requestId: request.requestId,
      action: 'inspect',
      result: {
        ok: false,
        kind: 'depth',
        error: error.message,
        elapsedMs: performance.now() - startedAt,
      },
    };
  }
}
