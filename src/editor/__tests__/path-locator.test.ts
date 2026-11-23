import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { findPathRange, findPathAtOffset } from '../path-locator';

function createJsonState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [json()],
  });
}

describe('path-locator', () => {
  const jsonDoc = `{
  "title": "Widget",
  "count": 42,
  "items": [
    "first",
    { "nested": true }
  ],
  "meta": {
    "tags": ["a", "b"]
  }
}`;

  describe('findPathRange', () => {
    it('finds top-level object property range', () => {
      const state = createJsonState(jsonDoc);
      const range = findPathRange(state, ['title']);
      expect(range).not.toBeNull();
      const text = state.doc.sliceString(range!.from, range!.to);
      expect(text).toBe('"Widget"');
    });

    it('finds array element range', () => {
      const state = createJsonState(jsonDoc);
      const range = findPathRange(state, ['items', 0]);
      expect(range).not.toBeNull();
      const text = state.doc.sliceString(range!.from, range!.to);
      expect(text).toBe('"first"');
    });

    it('finds nested object property inside array', () => {
      const state = createJsonState(jsonDoc);
      const range = findPathRange(state, ['items', 1, 'nested']);
      expect(range).not.toBeNull();
      const text = state.doc.sliceString(range!.from, range!.to);
      expect(text).toBe('true');
    });

    it('returns null for non-existent path', () => {
      const state = createJsonState(jsonDoc);
      const range = findPathRange(state, ['items', 99]);
      expect(range).toBeNull();
    });
  });

  describe('findPathAtOffset', () => {
    it('locates property path from cursor offset', () => {
      const state = createJsonState(jsonDoc);
      const offset = jsonDoc.indexOf('"Widget"') + 2;
      const path = findPathAtOffset(state, offset);
      expect(path).toEqual(['title']);
    });

    it('locates nested array item path from cursor offset', () => {
      const state = createJsonState(jsonDoc);
      const offset = jsonDoc.indexOf('"first"') + 2;
      const path = findPathAtOffset(state, offset);
      expect(path).toEqual(['items', 0]);
    });
  });
});
