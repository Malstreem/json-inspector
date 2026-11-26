/**
 * JSON Diff comparison dialog UI.
 */
import { diffJson, type DiffEntry } from '../json/diff';
import type { JsonPath, JsonValue } from '../json/types';

export interface DiffDialogElements {
  dialog: HTMLDialogElement;
  inputA: HTMLTextAreaElement;
  inputB: HTMLTextAreaElement;
  btnUseCurrent: HTMLButtonElement;
  btnSwap: HTMLButtonElement;
  btnCompare: HTMLButtonElement;
  btnClose: HTMLButtonElement;
  summaryEl: HTMLElement;
  resultsEl: HTMLElement;
}

export interface DiffDialogOptions {
  getCurrentJson: () => string;
  onSelectPath?: (path: JsonPath) => void;
}

function formatPreview(value: JsonValue | undefined): string {
  if (value === undefined) return '';
  const serialized = JSON.stringify(value);
  return serialized.length > 70 ? `${serialized.slice(0, 67)}...` : serialized;
}

export class DiffDialogView {
  private readonly elements: DiffDialogElements;
  private readonly options: DiffDialogOptions;

  constructor(elements: DiffDialogElements, options: DiffDialogOptions) {
    this.elements = elements;
    this.options = options;
    this.bindEvents();
  }

  private bindEvents(): void {
    const { dialog, btnUseCurrent, btnSwap, btnCompare, btnClose } = this.elements;

    btnUseCurrent.addEventListener('click', () => {
      this.elements.inputA.value = this.options.getCurrentJson();
      this.compare();
    });

    btnSwap.addEventListener('click', () => {
      const temp = this.elements.inputA.value;
      this.elements.inputA.value = this.elements.inputB.value;
      this.elements.inputB.value = temp;
      this.compare();
    });

    btnCompare.addEventListener('click', () => this.compare());

    btnClose.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  show(): void {
    const current = this.options.getCurrentJson();
    this.elements.inputA.value = current;
    if (!this.elements.inputB.value.trim()) {
      this.elements.inputB.value = current;
    }
    this.compare();
    this.elements.dialog.showModal();
  }

  compare(): void {
    const { inputA, inputB, summaryEl, resultsEl } = this.elements;
    resultsEl.replaceChildren();

    let parsedA: JsonValue;
    let parsedB: JsonValue;
    try {
      parsedA = JSON.parse(inputA.value) as JsonValue;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      summaryEl.textContent = `JSON A error: ${msg}`;
      summaryEl.className = 'diff-summary is-error';
      return;
    }

    try {
      parsedB = JSON.parse(inputB.value) as JsonValue;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      summaryEl.textContent = `JSON B error: ${msg}`;
      summaryEl.className = 'diff-summary is-error';
      return;
    }

    const entries = diffJson(parsedA, parsedB);
    this.renderSummary(entries);
    this.renderEntries(entries);
  }

  private renderSummary(entries: DiffEntry[]): void {
    const { summaryEl } = this.elements;
    summaryEl.className = 'diff-summary';
    summaryEl.replaceChildren();

    if (entries.length === 0) {
      const matchSpan = document.createElement('span');
      matchSpan.className = 'diff-badge is-identical';
      matchSpan.textContent = 'No differences — documents are identical';
      summaryEl.appendChild(matchSpan);
      return;
    }

    const counts = { added: 0, removed: 0, changed: 0 };
    for (const entry of entries) counts[entry.kind]++;

    const badges: Array<[string, string]> = [
      [`+${counts.added} added`, 'is-added'],
      [`-${counts.removed} removed`, 'is-removed'],
      [`~${counts.changed} changed`, 'is-changed'],
    ];

    for (const [text, cls] of badges) {
      const span = document.createElement('span');
      span.className = `diff-badge ${cls}`;
      span.textContent = text;
      summaryEl.appendChild(span);
    }
  }

  private renderEntries(entries: DiffEntry[]): void {
    const { resultsEl } = this.elements;
    for (const entry of entries) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `diff-item is-${entry.kind}`;

      const badge = document.createElement('span');
      badge.className = 'diff-item-kind';
      badge.textContent =
        entry.kind === 'added' ? '+' : entry.kind === 'removed' ? '-' : '~';

      const pathEl = document.createElement('span');
      pathEl.className = 'diff-item-path';
      pathEl.textContent = entry.formattedPath;

      const detailEl = document.createElement('span');
      detailEl.className = 'diff-item-detail';
      if (entry.kind === 'added') {
        detailEl.textContent = formatPreview(entry.after);
      } else if (entry.kind === 'removed') {
        detailEl.textContent = formatPreview(entry.before);
      } else {
        detailEl.textContent = `${formatPreview(entry.before)} -> ${formatPreview(entry.after)}`;
      }

      item.append(badge, pathEl, detailEl);
      item.addEventListener('click', () => {
        this.options.onSelectPath?.(entry.path);
        this.elements.dialog.close();
      });

      resultsEl.appendChild(item);
    }
  }
}
