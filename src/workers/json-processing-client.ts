import type {
  JsonProcessingRequest,
  JsonProcessingResponse,
  JsonFormattingResult,
  JsonProcessingResult,
} from './json-processing.protocol';

interface WorkerPort {
  onerror: ((event: ErrorEvent) => void) | null;
  onmessage: ((event: MessageEvent<JsonProcessingResponse>) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: JsonProcessingRequest): void;
  terminate(): void;
}

type WorkerFactory = () => WorkerPort;

export interface JsonProcessingPort {
  inspect(source: string): Promise<JsonProcessingResult>;
  format(source: string): Promise<JsonFormattingResult>;
  destroy(): void;
}

interface PendingRequest {
  action: JsonProcessingRequest['action'];
  reject: (error: Error) => void;
  resolve: (response: JsonProcessingResponse) => void;
}

function createWorker(): WorkerPort {
  return new Worker(
    new URL('./json-processing.worker.ts', import.meta.url),
    { type: 'module' }
  );
}

export class JsonProcessingWorker implements JsonProcessingPort {
  private readonly createWorker: WorkerFactory;
  private worker: WorkerPort | null = null;
  private requestId = 0;
  private readonly pending = new Map<number, PendingRequest>();

  constructor(workerFactory: WorkerFactory = createWorker) {
    this.createWorker = workerFactory;
  }

  async inspect(source: string): Promise<JsonProcessingResult> {
    const response = await this.request('inspect', source);
    if (response.action !== 'inspect') {
      throw new Error('Received a mismatched response for JSON inspection.');
    }
    return response.result;
  }

  async format(source: string): Promise<JsonFormattingResult> {
    const response = await this.request('format', source);
    if (response.action !== 'format') {
      throw new Error('Received a mismatched response for JSON formatting.');
    }
    return response.result;
  }

  destroy(): void {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }

    this.rejectPending(new Error('JSON processing stopped because the application closed.'));
  }

  private request(
    action: JsonProcessingRequest['action'],
    source: string
  ): Promise<JsonProcessingResponse> {
    const worker = this.getWorker();
    const requestId = ++this.requestId;
    const request: JsonProcessingRequest = { requestId, action, source };

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { action, resolve, reject });
      try {
        worker.postMessage(request);
      } catch (error) {
        this.pending.delete(requestId);
        reject(this.toError(error, 'Unable to send JSON to the processing worker.'));
      }
    });
  }

  private getWorker(): WorkerPort {
    if (this.worker) return this.worker;

    const worker = this.createWorker();
    worker.onmessage = this.onMessage;
    worker.onerror = this.onError;
    worker.onmessageerror = this.onMessageError;
    this.worker = worker;
    return worker;
  }

  private onMessage = (event: MessageEvent<JsonProcessingResponse>): void => {
    const response = event.data;
    const pending = this.pending.get(response.requestId);
    if (!pending) return;
    this.pending.delete(response.requestId);

    if (response.action === 'failure') {
      pending.reject(new Error(response.error));
      return;
    }
    if (response.action !== pending.action) {
      pending.reject(new Error('Received a mismatched response from the JSON worker.'));
      return;
    }

    pending.resolve(response);
  };

  private onError = (event: ErrorEvent): void => {
    event.preventDefault();
    this.failWorker(new Error(event.message || 'The JSON processing worker failed.'));
  };

  private onMessageError = (): void => {
    this.failWorker(new Error('The JSON processing worker returned unreadable data.'));
  };

  private failWorker(error: Error): void {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
    this.rejectPending(error);
  }

  private rejectPending(error: Error): void {
    for (const request of this.pending.values()) {
      request.reject(error);
    }
    this.pending.clear();
  }

  private toError(error: unknown, fallback: string): Error {
    return error instanceof Error ? error : new Error(fallback);
  }
}
