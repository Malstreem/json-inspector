// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { initFileDropAndPaste } from '../drop-overlay';

describe('initFileDropAndPaste', () => {
  it('manages drag overlay active state on dragenter and dragleave', () => {
    const overlay = document.createElement('div');
    overlay.hidden = true;
    const onLoaded = vi.fn();
    const onError = vi.fn();

    const cleanup = initFileDropAndPaste(overlay, {
      onJsonLoaded: onLoaded,
      onError,
    });

    const enterEvent = new Event('dragenter');
    Object.defineProperty(enterEvent, 'dataTransfer', {
      value: { types: ['Files'] },
    });
    window.dispatchEvent(enterEvent);

    expect(overlay.hidden).toBe(false);
    expect(overlay.classList.contains('is-active')).toBe(true);

    const leaveEvent = new Event('dragleave');
    window.dispatchEvent(leaveEvent);

    expect(overlay.hidden).toBe(true);
    expect(overlay.classList.contains('is-active')).toBe(false);

    cleanup();
  });

  it('handles paste event for valid JSON strings', () => {
    const overlay = document.createElement('div');
    const onLoaded = vi.fn();
    const onError = vi.fn();

    const cleanup = initFileDropAndPaste(overlay, {
      onJsonLoaded: onLoaded,
      onError,
    });

    const pasteEvent = new Event('paste', { cancelable: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: (type: string) =>
          type === 'text/plain' ? '{"key": "value"}' : '',
      },
    });

    window.dispatchEvent(pasteEvent);

    expect(onLoaded).toHaveBeenCalledWith('{"key": "value"}', 'clipboard');
    cleanup();
  });

  it('ignores non-json paste events', () => {
    const overlay = document.createElement('div');
    const onLoaded = vi.fn();
    const onError = vi.fn();

    const cleanup = initFileDropAndPaste(overlay, {
      onJsonLoaded: onLoaded,
      onError,
    });

    const pasteEvent = new Event('paste', { cancelable: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: () => 'plain text string without brackets',
      },
    });

    window.dispatchEvent(pasteEvent);

    expect(onLoaded).not.toHaveBeenCalled();
    cleanup();
  });
});
