import { describe, expect, it } from 'vitest';
import {
  serializeJsonValue,
  formatJsonPath,
} from '../copy';

describe('formatJsonPath', () => {
  it('formats property and array-index paths', () => {
    expect(formatJsonPath(['users', 0, 'name'])).toBe('$.users[0].name');
  });

  it('quotes property names that are not identifiers', () => {
    expect(formatJsonPath(['user.data', 'first name'])).toBe(
      '$["user.data"]["first name"]'
    );
  });

  it('formats the root path', () => {
    expect(formatJsonPath([])).toBe('$');
  });
});

describe('serializeJsonValue', () => {
  it('copies nested values as formatted JSON', () => {
    expect(serializeJsonValue({ items: [1, true] })).toBe(
      '{\n  "items": [\n    1,\n    true\n  ]\n}'
    );
  });

  it('rejects values that are not valid JSON values', () => {
    expect(() => serializeJsonValue(undefined)).toThrow(TypeError);
  });
});
