// WebAssembly Spatial Query Engine
// Memory layout for boxes: 4 x f32 per box [minX, minY, maxX, maxY] (16 bytes per box)
// Output: contiguous i32 array of matching box indices

export function queryBoxes(
  boxesPtr: usize,
  count: i32,
  qMinX: f32,
  qMinY: f32,
  qMaxX: f32,
  qMaxY: f32,
  outIndicesPtr: usize
): i32 {
  let matched = 0;

  for (let i = 0; i < count; i++) {
    const offset = i << 4; // i * 16 bytes
    const minX = load<f32>(boxesPtr + offset);
    const minY = load<f32>(boxesPtr + offset + 4);
    const maxX = load<f32>(boxesPtr + offset + 8);
    const maxY = load<f32>(boxesPtr + offset + 12);

    // Axis-Aligned Bounding Box (AABB) intersection
    if (minX <= qMaxX && maxX >= qMinX && minY <= qMaxY && maxY >= qMinY) {
      store<i32>(outIndicesPtr + (matched << 2), i);
      matched++;
    }
  }

  return matched;
}

export function computeUnion(
  boxesPtr: usize,
  count: i32,
  outBoundsPtr: usize
): void {
  if (count <= 0) {
    store<f32>(outBoundsPtr, 0);
    store<f32>(outBoundsPtr + 4, 0);
    store<f32>(outBoundsPtr + 8, 0);
    store<f32>(outBoundsPtr + 12, 0);
    return;
  }

  let minX = load<f32>(boxesPtr);
  let minY = load<f32>(boxesPtr + 4);
  let maxX = load<f32>(boxesPtr + 8);
  let maxY = load<f32>(boxesPtr + 12);

  for (let i = 1; i < count; i++) {
    const offset = i << 4;
    const x1 = load<f32>(boxesPtr + offset);
    const y1 = load<f32>(boxesPtr + offset + 4);
    const x2 = load<f32>(boxesPtr + offset + 8);
    const y2 = load<f32>(boxesPtr + offset + 12);

    if (x1 < minX) minX = x1;
    if (y1 < minY) minY = y1;
    if (x2 > maxX) maxX = x2;
    if (y2 > maxY) maxY = y2;
  }

  store<f32>(outBoundsPtr, minX);
  store<f32>(outBoundsPtr + 4, minY);
  store<f32>(outBoundsPtr + 8, maxX);
  store<f32>(outBoundsPtr + 12, maxY);
}
