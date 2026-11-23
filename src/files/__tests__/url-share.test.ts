// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  stringToBase64Url,
  base64UrlToString,
  createShareUrl,
  getJsonFromHash,
} from '../url-share';

describe('url-share', () => {
  it('round-trips string through URL-safe base64', () => {
    const original = JSON.stringify({ hello: 'world', special: '⚡✨üöä' });
    const encoded = stringToBase64Url(original);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    const decoded = base64UrlToString(encoded);
    expect(decoded).toBe(original);
  });

  it('generates shareable url with hash', () => {
    const json = '{"foo": "bar"}';
    const result = createShareUrl(json);
    expect(result.isTooLarge).toBe(false);
    expect(result.url).toContain('#data=');
  });

  it('marks payloads exceeding limit as too large', () => {
    const bigString = 'x'.repeat(70 * 1024);
    const result = createShareUrl(bigString);
    expect(result.isTooLarge).toBe(true);
  });

  it('reads and decodes valid JSON from hash', () => {
    const data = JSON.stringify({ active: true, count: 5 });
    const hash = `#data=${stringToBase64Url(data)}`;
    const parsed = getJsonFromHash(hash);
    expect(parsed).toBe(data);
  });

  it('returns null for missing or invalid hash', () => {
    expect(getJsonFromHash('')).toBeNull();
    expect(getJsonFromHash('#other-hash')).toBeNull();
    expect(getJsonFromHash('#data=invalid-base64---')).toBeNull();
  });
});
