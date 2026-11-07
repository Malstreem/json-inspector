import { processJsonRequest } from './json-processing';
import type {
  JsonProcessingResponse,
  JsonProcessingRequest,
} from './json-processing.protocol';

self.addEventListener('message', (event: MessageEvent<JsonProcessingRequest>) => {
  const request = event.data;
  try {
    self.postMessage(processJsonRequest(request));
  } catch (error) {
    const response: JsonProcessingResponse = {
      requestId: request.requestId,
      action: 'failure',
      error: error instanceof Error ? error.message : 'Unexpected JSON processing failure.',
    };
    self.postMessage(response);
  }
});
