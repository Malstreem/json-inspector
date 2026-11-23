// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { FetchDialogView, type FetchDialogElements } from '../fetch-dialog';

describe('FetchDialogView', () => {
  function createTestElements(): FetchDialogElements {
    const dialog = document.createElement('dialog');
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();

    const urlInput = document.createElement('input');
    const presetBtn = document.createElement('button');
    presetBtn.dataset.url = 'https://api.github.com/users/octocat';

    const btnSubmit = document.createElement('button');
    const btnClose = document.createElement('button');
    const statusEl = document.createElement('div');

    return {
      dialog,
      urlInput,
      presetButtons: [presetBtn],
      btnSubmit,
      btnClose,
      statusEl,
    };
  }

  it('populates url input when preset button is clicked', () => {
    const elements = createTestElements();
    const onLoaded = vi.fn();
    const onError = vi.fn();

    new FetchDialogView(elements, { onLoaded, onError });

    elements.presetButtons[0].click();
    expect(elements.urlInput.value).toBe('https://api.github.com/users/octocat');
  });

  it('fetches JSON successfully and calls onLoaded', async () => {
    const elements = createTestElements();
    elements.urlInput.value = 'https://api.example.com/data';
    const onLoaded = vi.fn();
    const onError = vi.fn();

    const mockData = { id: 1, title: 'Test' };
    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });
    vi.stubGlobal('fetch', globalFetch);

    new FetchDialogView(elements, { onLoaded, onError });

    elements.btnSubmit.click();
    await vi.waitFor(() => {
      expect(onLoaded).toHaveBeenCalledWith(
        JSON.stringify(mockData, null, 2),
        'api.example.com'
      );
    });

    vi.unstubAllGlobals();
  });

  it('reports error when fetch fails or receives invalid JSON', async () => {
    const elements = createTestElements();
    elements.urlInput.value = 'https://api.example.com/bad';
    const onLoaded = vi.fn();
    const onError = vi.fn();

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html>not json</html>',
    });
    vi.stubGlobal('fetch', globalFetch);

    new FetchDialogView(elements, { onLoaded, onError });

    elements.btnSubmit.click();
    await vi.waitFor(() => {
      expect(elements.statusEl.textContent).toContain('Response is not valid JSON');
    });

    vi.unstubAllGlobals();
  });
});
