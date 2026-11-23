/**
 * Fetch JSON from URL dialog UI and request handler.
 */

export interface FetchDialogElements {
  dialog: HTMLDialogElement;
  urlInput: HTMLInputElement;
  presetButtons: NodeListOf<HTMLButtonElement> | HTMLButtonElement[];
  btnSubmit: HTMLButtonElement;
  btnClose: HTMLButtonElement;
  statusEl: HTMLElement;
}

export interface FetchDialogOptions {
  onLoaded: (jsonContent: string, sourceName: string) => void;
  onError: (message: string) => void;
}

export class FetchDialogView {
  private readonly elements: FetchDialogElements;
  private readonly options: FetchDialogOptions;
  private isFetching = false;

  constructor(elements: FetchDialogElements, options: FetchDialogOptions) {
    this.elements = elements;
    this.options = options;

    this.bindEvents();
  }

  private bindEvents(): void {
    const { dialog, urlInput, presetButtons, btnSubmit, btnClose } = this.elements;

    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        if (url) {
          urlInput.value = url;
          this.setStatus('', false);
        }
      });
    });

    btnSubmit.addEventListener('click', () => {
      void this.executeFetch();
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void this.executeFetch();
      }
    });

    btnClose.addEventListener('click', () => {
      dialog.close();
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  }

  show(): void {
    this.setStatus('', false);
    this.elements.dialog.showModal();
    this.elements.urlInput.focus();
  }

  private setStatus(message: string, isError: boolean): void {
    this.elements.statusEl.textContent = message;
    this.elements.statusEl.classList.toggle('is-error', isError);
  }

  private async executeFetch(): Promise<void> {
    const rawUrl = this.elements.urlInput.value.trim();
    if (!rawUrl) {
      this.setStatus('Please enter a valid URL', true);
      return;
    }

    let url: URL;
    try {
      url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    } catch {
      this.setStatus('Invalid URL format', true);
      return;
    }

    if (this.isFetching) return;
    this.isFetching = true;
    this.setStatus(`Fetching ${url.hostname}…`, false);
    this.elements.btnSubmit.disabled = true;

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      // Verify it is JSON
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);

      this.options.onLoaded(formatted, url.hostname);
      this.elements.dialog.close();
    } catch (err: unknown) {
      let message = 'Network request failed';
      if (err instanceof SyntaxError) {
        message = 'Response is not valid JSON';
      } else if (err instanceof TypeError) {
        message = 'CORS blocked or network error. Verify remote server allows cross-origin requests.';
      } else if (err instanceof Error) {
        message = err.message;
      }
      this.setStatus(message, true);
      this.options.onError(message);
    } finally {
      this.isFetching = false;
      this.elements.btnSubmit.disabled = false;
    }
  }
}
