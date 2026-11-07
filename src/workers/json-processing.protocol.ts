import type { GraphProjection } from '../graph/projection';

export type JsonProcessingRequest =
  | { requestId: number; action: 'inspect'; source: string }
  | { requestId: number; action: 'format'; source: string };

export type JsonProcessingResult =
  | { ok: true; graph: GraphProjection; elapsedMs: number }
  | { ok: false; kind: 'invalid-json' | 'depth'; error: string; elapsedMs: number };

export type JsonFormattingResult =
  | { ok: true; formatted: string; elapsedMs: number }
  | { ok: false; kind: 'invalid-json'; error: string; elapsedMs: number };

export type JsonProcessingResponse =
  | { requestId: number; action: 'inspect'; result: JsonProcessingResult }
  | { requestId: number; action: 'format'; result: JsonFormattingResult }
  | { requestId: number; action: 'failure'; error: string };
