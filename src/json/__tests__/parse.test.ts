import { describe, expect, it } from 'vitest';
import { parseJson } from '../parse';

describe('parseJson', () => {
  it('parses JSON objects, arrays, and primitive values', () => {
    expect(parseJson('{"enabled":true}')).toEqual({
      ok: true,
      value: { enabled: true },
    });
    expect(parseJson('[1, null]')).toEqual({ ok: true, value: [1, null] });
    expect(parseJson('"text"')).toEqual({ ok: true, value: 'text' });
  });

  it('returns a useful error for invalid JSON', () => {
    const result = parseJson('{"enabled":}');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('JSON');
    }
  });
});
