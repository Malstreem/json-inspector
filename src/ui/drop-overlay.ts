/**
 * Global drag-and-drop overlay and paste handling for JSON files and text.
 */

export interface DropOverlayOptions {
  onJsonLoaded: (content: string, sourceName: string) => void;
  onError: (message: string) => void;
}

export function initFileDropAndPaste(
  overlayEl: HTMLElement,
  options: DropOverlayOptions
): () => void {
  let dragCounter = 0;
  const controller = new AbortController();
  const { signal } = controller;

  const showOverlay = () => {
    overlayEl.hidden = false;
    overlayEl.classList.add('is-active');
  };

  const hideOverlay = () => {
    dragCounter = 0;
    overlayEl.classList.remove('is-active');
    overlayEl.hidden = true;
  };

  // Window drag events
  window.addEventListener(
    'dragenter',
    (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types.includes('Files')) {
        showOverlay();
      }
    },
    { signal }
  );

  window.addEventListener(
    'dragover',
    (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    { signal }
  );

  window.addEventListener(
    'dragleave',
    (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        hideOverlay();
      }
    },
    { signal }
  );

  window.addEventListener(
    'drop',
    (e) => {
      e.preventDefault();
      hideOverlay();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      file
        .text()
        .then((content) => {
          options.onJsonLoaded(content, file.name);
        })
        .catch((err: unknown) => {
          const detail = err instanceof Error ? `: ${err.message}` : '';
          options.onError(`Failed to read file "${file.name}"${detail}`);
        });
    },
    { signal }
  );

  // Global paste handler
  window.addEventListener(
    'paste',
    (e) => {
      const active = document.activeElement;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        Boolean(active?.closest('.cm-editor'));

      // If user is typing in editor or search input, let default paste happen
      if (isInput) return;

      const pastedText = e.clipboardData?.getData('text/plain');
      if (!pastedText) return;

      const trimmed = pastedText.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        e.preventDefault();
        options.onJsonLoaded(trimmed, 'clipboard');
      }
    },
    { signal }
  );

  return () => {
    controller.abort();
    hideOverlay();
  };
}
