import { describe, expect, it } from 'vitest';
import { buildGraph } from '../../graph/projection';
import { JsonProcessingWorker } from '../json-processing-client';
import type {
  JsonProcessingResponse,
  JsonProcessingRequest,
} from '../json-processing.protocol';

class FakeWorker {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<JsonProcessingResponse>) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  requests: JsonProcessingRequest[] = [];
  terminated = false;

  postMessage(request: JsonProcessingRequest): void {
    this.requests.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(response: JsonProcessingResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<JsonProcessingResponse>);
  }
}

describe('JsonProcessingWorker', () => {
  it('correlates concurrent requests even when responses arrive out of order', async () => {
    const worker = new FakeWorker();
    const client = new JsonProcessingWorker(() => worker);
    const inspection = client.inspect('{"value":1}');
    const formatting = client.format('{"value":1}');

    expect(worker.requests.map(({ action }) => action)).toEqual(['inspect', 'format']);
    worker.respond({
      requestId: worker.requests[1].requestId,
      action: 'format',
      result: { ok: true, formatted: '{\n  "value": 1\n}', elapsedMs: 2 },
    });
    worker.respond({
      requestId: worker.requests[0].requestId,
      action: 'inspect',
      result: {
        ok: true,
        graph: buildGraph({ value: 1 }),
        elapsedMs: 1,
      },
    });

    await expect(formatting).resolves.toEqual({
      ok: true,
      formatted: '{\n  "value": 1\n}',
      elapsedMs: 2,
    });
    await expect(inspection).resolves.toMatchObject({ ok: true, elapsedMs: 1 });
    client.destroy();
    expect(worker.terminated).toBe(true);
  });

  it('surfaces worker processing failures', async () => {
    const worker = new FakeWorker();
    const client = new JsonProcessingWorker(() => worker);
    const inspection = client.inspect('{"value":1}');
    worker.respond({
      requestId: worker.requests[0].requestId,
      action: 'failure',
      error: 'Unexpected processing error.',
    });

    await expect(inspection).rejects.toThrow('Unexpected processing error.');
    client.destroy();
  });

  it('rejects pending requests when the worker is destroyed', async () => {
    const worker = new FakeWorker();
    const client = new JsonProcessingWorker(() => worker);
    const inspection = client.inspect('{"value":1}');
    const rejected = expect(inspection).rejects.toThrow('application closed');

    client.destroy();

    await rejected;
    expect(worker.terminated).toBe(true);
  });

  it('surfaces worker runtime errors and creates a fresh worker for later work', async () => {
    const workers: FakeWorker[] = [];
    const client = new JsonProcessingWorker(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    const inspection = client.inspect('{"value":1}');
    const rejected = expect(inspection).rejects.toThrow('worker runtime failed');

    workers[0].onerror?.({
      message: 'worker runtime failed',
      preventDefault: () => {},
    } as ErrorEvent);

    await rejected;
    expect(workers[0].terminated).toBe(true);

    const formatting = client.format('{"value":1}');
    expect(workers).toHaveLength(2);
    workers[1].respond({
      requestId: workers[1].requests[0].requestId,
      action: 'format',
      result: { ok: true, formatted: '{"value":1}', elapsedMs: 1 },
    });
    await expect(formatting).resolves.toMatchObject({ ok: true });
    client.destroy();
  });
});
