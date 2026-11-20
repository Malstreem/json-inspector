import { describe, expect, it } from 'vitest';
import { getWasmSpatial, executeWasmSpatialQuery } from '../wasm-spatial';

describe('WebAssembly Spatial Query', () => {
  it('instantiates the Wasm module and queries intersecting boxes', async () => {
    const wasm = await getWasmSpatial();
    expect(wasm).not.toBeNull();
    if (!wasm) return;

    // 3 boxes:
    // Box 0: (0, 0, 10, 10) -> overlaps query
    // Box 1: (50, 50, 60, 60) -> outside query
    // Box 2: (5, 5, 15, 15) -> overlaps query
    const boxes = new Float32Array([
      0, 0, 10, 10,
      50, 50, 60, 60,
      5, 5, 15, 15,
    ]);

    const query = { minX: 2, minY: 2, maxX: 12, maxY: 12, width: 10, height: 10 };
    const matches = executeWasmSpatialQuery(wasm, boxes, 3, query);

    expect(matches).toEqual([0, 2]);
  });
});
