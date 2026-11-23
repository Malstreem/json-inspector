/**
 * Encodes and decodes JSON documents in the URL hash for easy sharing.
 */

const HASH_PREFIX = '#data=';
const MAX_SHARE_PAYLOAD_BYTES = 64 * 1024; // 64 KB limit for safe browser URLs

/**
 * Encode a string to URL-safe base64.
 */
export function stringToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a URL-safe base64 string.
 */
export function base64UrlToString(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Generate a shareable URL containing the JSON payload in its hash.
 */
export function createShareUrl(jsonContent: string): { url: string; byteLength: number; isTooLarge: boolean } {
  const byteLength = new TextEncoder().encode(jsonContent).length;
  if (byteLength > MAX_SHARE_PAYLOAD_BYTES) {
    return { url: '', byteLength, isTooLarge: true };
  }

  const encoded = stringToBase64Url(jsonContent);
  const url = new URL(window.location.href);
  url.hash = `data=${encoded}`;
  return { url: url.toString(), byteLength, isTooLarge: false };
}

/**
 * Read and decode JSON content from the current window hash, if present.
 */
export function getJsonFromHash(hash: string = window.location.hash): string | null {
  if (!hash.startsWith(HASH_PREFIX) && !hash.startsWith('#json=')) {
    return null;
  }

  const encoded = hash.startsWith(HASH_PREFIX)
    ? hash.slice(HASH_PREFIX.length)
    : hash.slice('#json='.length);

  if (!encoded) return null;

  try {
    const decoded = base64UrlToString(encoded);
    // Validate it parses as JSON
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}
