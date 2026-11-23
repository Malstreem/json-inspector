/**
 * Breadcrumb navigation bar displaying the current JSON path with click-to-navigate and copy.
 */
import type { JsonPath } from '../json/types';
import { formatJsonPath } from '../graph/copy';

export interface BreadcrumbsOptions {
  onNavigatePath: (path: JsonPath) => void;
  onCopyStatus: (message: string, isError: boolean) => void;
}

export class BreadcrumbsView {
  private readonly container: HTMLElement;
  private readonly copyButton: HTMLButtonElement | null;
  private readonly options: BreadcrumbsOptions;
  private currentPath: JsonPath = [];

  constructor(
    container: HTMLElement,
    copyButton: HTMLButtonElement | null,
    options: BreadcrumbsOptions
  ) {
    this.container = container;
    this.copyButton = copyButton;
    this.options = options;

    this.copyButton?.addEventListener('click', () => {
      this.copyCurrentPath();
    });

    this.render();
  }

  setPath(path: JsonPath): void {
    this.currentPath = path;
    this.render();
  }

  getCurrentPath(): JsonPath {
    return this.currentPath;
  }

  private render(): void {
    this.container.replaceChildren();

    // Root segment
    const rootItem = document.createElement('button');
    rootItem.type = 'button';
    rootItem.className = 'breadcrumb-item is-root';
    rootItem.textContent = '$';
    rootItem.title = 'Root document ($)';
    rootItem.addEventListener('click', () => {
      this.options.onNavigatePath([]);
    });
    this.container.appendChild(rootItem);

    if (this.currentPath.length === 0) {
      if (this.copyButton) {
        this.copyButton.disabled = true;
      }
      return;
    }

    if (this.copyButton) {
      this.copyButton.disabled = false;
    }

    for (let i = 0; i < this.currentPath.length; i++) {
      const separator = document.createElement('span');
      separator.className = 'breadcrumb-separator';
      separator.textContent = '>';
      this.container.appendChild(separator);

      const segment = this.currentPath[i];
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'breadcrumb-item';
      item.textContent = typeof segment === 'number' ? `[${segment}]` : String(segment);
      const subPath = this.currentPath.slice(0, i + 1);
      item.title = `Navigate to ${formatJsonPath(subPath)}`;

      item.addEventListener('click', () => {
        this.options.onNavigatePath(subPath);
      });

      this.container.appendChild(item);
    }
  }

  private copyCurrentPath(): void {
    const formatted = formatJsonPath(this.currentPath);
    navigator.clipboard
      .writeText(formatted)
      .then(() => {
        this.options.onCopyStatus(`Copied ${formatted}`, false);
      })
      .catch(() => {
        this.options.onCopyStatus('Failed to copy path', true);
      });
  }
}
