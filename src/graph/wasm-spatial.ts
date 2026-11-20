import type { BoundingBox } from './layout';
import { SPATIAL_WASM_BASE64 } from './wasm-spatial-binary';

export interface WasmSpatialExports {
  memory: WebAssembly.Memory;
  queryBoxes(
    boxesPtr: number,
    count: number,
    qMinX: number,
    qMinY: number,
    qMaxX: number,
    qMaxY: number,
    outIndicesPtr: number
  ): number;
  computeUnion(boxesPtr: number, count: number, outBoundsPtr: number): void;
}

let wasmInstance: WasmSpatialExports | null = null;
let initPromise: Promise<WasmSpatialExports | null> | null = null;

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function getWasmSpatial(): Promise<WasmSpatialExports | null> {
  if (wasmInstance) return wasmInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const bytes = decodeBase64(SPATIAL_WASM_BASE64);
      const result: unknown = await WebAssembly.instantiate(bytes, {});
      const instance =
        result && typeof result === 'object' && 'instance' in result
          ? (result as { instance: WebAssembly.Instance }).instance
          : (result as WebAssembly.Instance);
      wasmInstance = instance.exports as unknown as WasmSpatialExports;
      return wasmInstance;
    } catch {
      return null;
    }
  })();

  return initPromise;
}

/**
 * Execute spatial query using WebAssembly linear memory
 */
export function executeWasmSpatialQuery(
  wasm: WasmSpatialExports,
  boxes: Float32Array,
  count: number,
  view: BoundingBox
): number[] {
  const memory = wasm.memory;
  const bytesNeeded = count * 16 + count * 4 + 1024;
  const currentBytes = memory.buffer.byteLength;

  if (bytesNeeded > currentBytes) {
    const pagesNeeded = Math.ceil((bytesNeeded - currentBytes) / 65536);
    memory.grow(pagesNeeded);
  }

  const boxesPtr = 1024;
  const outPtr = boxesPtr + count * 16;

  // Copy boxes into Wasm linear memory
  const wasmFloatView = new Float32Array(memory.buffer, boxesPtr, count * 4);
  wasmFloatView.set(boxes);

  // Call WebAssembly
  const matchedCount = wasm.queryBoxes(
    boxesPtr,
    count,
    view.minX,
    view.minY,
    view.maxX,
    view.maxY,
    outPtr
  );

  // Read matching indices from Wasm linear memory
  const wasmIntView = new Int32Array(memory.buffer, outPtr, matchedCount);
  const result = new Array<number>(matchedCount);
  for (let i = 0; i < matchedCount; i++) {
    result[i] = wasmIntView[i];
  }

  return result;
}
