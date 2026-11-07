import {
  serializeJsonValue,
  formatJsonPath,
} from './copy';
import type { FlatRow, GraphNode } from './projection';

type CopyAction = 'value' | 'path' | 'key';

export class GraphCopyControls {
  private readonly svg: SVGSVGElement;
  private readonly onStatus: (message: string, isError: boolean) => void;
  private readonly eventController = new AbortController();
  private readonly menu: HTMLDivElement;
  private flatRows: FlatRow[] = [];
  private nodes: GraphNode[] = [];
  private selectedNode: GraphNode | null = null;
  private selectedRowIndex: number | null = null;
  private restoreRowFocusOnClose = false;

  constructor(
    svg: SVGSVGElement,
    onStatus: (message: string, isError: boolean) => void
  ) {
    this.svg = svg;
    this.onStatus = onStatus;
    this.menu = this.createMenu();
    document.body.append(this.menu);
    this.bindEvents();
  }

  setFlatRows(flatRows: FlatRow[]): void {
    this.flatRows = flatRows;
    this.closeMenu(false);
  }

  setNodes(nodes: GraphNode[]): void {
    this.nodes = nodes;
    if (this.selectedNode && !nodes.includes(this.selectedNode)) {
      this.selectedNode = null;
    }
    this.applySelectedNode();
  }

  destroy(): void {
    this.eventController.abort();
    this.menu.remove();
  }

  private bindEvents(): void {
    const { signal } = this.eventController;
    this.svg.addEventListener('contextmenu', this.onContextMenu, { signal });
    this.svg.addEventListener('click', this.onSvgClick, { capture: true, signal });
    this.svg.addEventListener('focusin', this.onSvgFocusIn, { signal });
    this.svg.addEventListener('keydown', this.onSvgKeyDown, { signal });
    document.addEventListener('click', this.onDocumentClick, { signal });
    document.addEventListener('keydown', this.onDocumentKeyDown, { signal });
  }

  private createMenu(): HTMLDivElement {
    const menu = document.createElement('div');
    menu.className = 'graph-context-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Copy graph item');

    const actions: [CopyAction, string][] = [
      ['value', 'Copy value'],
      ['path', 'Copy path'],
      ['key', 'Copy key'],
    ];
    for (const [action, label] of actions) {
      const button = document.createElement('button');
      button.className = 'graph-context-menu-item';
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.tabIndex = -1;
      button.dataset.copyAction = action;
      button.textContent = label;
      menu.append(button);
    }

    menu.addEventListener('click', this.onMenuClick, { signal: this.eventController.signal });
    menu.addEventListener('keydown', this.onMenuKeyDown, { signal: this.eventController.signal });
    return menu;
  }

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    if (!(event.target instanceof Element)) return;

    const rowElement = event.target.closest<SVGGElement>('[data-row-index]');
    if (!rowElement) {
      this.closeMenu(false);
      return;
    }

    this.showMenu(rowElement, event.clientX, event.clientY, event.detail === 0);
  };

  private showMenu(
    rowElement: SVGGElement,
    x: number,
    y: number,
    restoreFocus: boolean
  ): void {
    const rowIndex = Number(rowElement.dataset.rowIndex);
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= this.flatRows.length) return;

    this.selectedRowIndex = rowIndex;
    this.restoreRowFocusOnClose = restoreFocus;
    const keyItem = this.menu.querySelector<HTMLButtonElement>('[data-copy-action="key"]');
    if (keyItem) keyItem.disabled = this.flatRows[rowIndex].row.key === null;

    const menuWidth = 180;
    const menuHeight = 140;
    this.menu.style.left = `${Math.max(0, Math.min(x, window.innerWidth - menuWidth))}px`;
    this.menu.style.top = `${Math.max(0, Math.min(y, window.innerHeight - menuHeight))}px`;
    this.menu.classList.add('is-open');
    this.menu.querySelector<HTMLButtonElement>('[data-copy-action="value"]')?.focus();
  };

  private onSvgKeyDown = (event: KeyboardEvent): void => {
    if (!(event.target instanceof Element)) return;
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    const rowElement = event.target.closest<SVGGElement>('[data-row-index]');
    if (!rowElement) return;

    event.preventDefault();
    const rect = rowElement.getBoundingClientRect();
    this.showMenu(rowElement, rect.left, rect.bottom, true);
  };

  private onSvgClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const nodeElement = event.target.closest<SVGGElement>('[data-node-index]');
    if (!nodeElement) {
      this.selectedNode = null;
      this.applySelectedNode();
      return;
    }
    this.selectNode(nodeElement, true);
  };

  private onSvgFocusIn = (event: FocusEvent): void => {
    if (!(event.target instanceof Element)) return;
    const nodeElement = event.target.closest<SVGGElement>('[data-node-index]');
    if (nodeElement) this.selectNode(nodeElement);
  };

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      Boolean(target.closest('.graph-context-menu')) ||
      Boolean(target.closest('.cm-editor'));
  }

  private selectNode(element: SVGGElement, focus = false): void {
    const index = Number(element.dataset.nodeIndex);
    if (!Number.isInteger(index) || index < 0 || index >= this.nodes.length) return;

    const node = this.nodes[index];
    if (this.selectedNode !== node) {
      this.selectedNode = node;
      this.onStatus('Node selected. Ctrl/Cmd+C copies JSON; Ctrl/Cmd+Alt+C copies its path.', false);
    }
    this.applySelectedNode();
    if (focus) element.focus();
  }

  private applySelectedNode(): void {
    const selectedIndex = this.selectedNode ? this.nodes.indexOf(this.selectedNode) : -1;
    this.svg.querySelectorAll<SVGGElement>('[data-node-index]').forEach((element) => {
      element.classList.toggle('is-selected', Number(element.dataset.nodeIndex) === selectedIndex);
    });
  }

  private copySelectedNode(action: 'value' | 'path'): void {
    if (!this.selectedNode) return;
    try {
      const text = action === 'value'
        ? serializeJsonValue(this.selectedNode.sourceValue)
        : formatJsonPath(this.selectedNode.path);
      this.writeClipboard(text, action);
    } catch (error) {
      this.onStatus(
        error instanceof Error ? error.message : 'Unable to prepare item for copying.',
        true
      );
    }
  }

  private onMenuClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element) || this.selectedRowIndex === null) return;
    const button = event.target.closest<HTMLButtonElement>('[data-copy-action]');
    if (!button || button.disabled) return;

    const flatRow = this.flatRows[this.selectedRowIndex];
    if (!flatRow) return;

    try {
      const action = button.dataset.copyAction;
      if (action === 'value') {
        this.writeClipboard(serializeJsonValue(flatRow.row.sourceValue), 'value');
      } else if (action === 'path') {
        this.writeClipboard(formatJsonPath(flatRow.path), 'path');
      } else if (action === 'key' && flatRow.row.key !== null) {
        this.writeClipboard(flatRow.row.key, 'key');
      }
    } catch (error) {
      this.onStatus(
        error instanceof Error ? error.message : 'Unable to prepare item for copying.',
        true
      );
    }
  };

  private writeClipboard(text: string, label: string): void {
    if (!navigator.clipboard?.writeText) {
      this.onStatus('Clipboard access is unavailable in this browser.', true);
      return;
    }

    void navigator.clipboard.writeText(text).then(() => {
      this.onStatus(`Copied ${label}.`, false);
      this.closeMenu(true);
    }).catch((error: unknown) => {
      const detail = error instanceof Error ? `: ${error.message}` : '';
      this.onStatus(`Unable to copy ${label}${detail}`, true);
    });
  }

  private onMenuKeyDown = (event: KeyboardEvent): void => {
    const items = [...this.menu.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)'
    )];
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu(true);
    } else if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    }

    if (nextIndex !== null && items[nextIndex]) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  };

  private onDocumentClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Node) || !this.menu.contains(event.target)) {
      this.closeMenu(false);
    }
  };

  private onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.menu.classList.contains('is-open')) {
      this.closeMenu(true);
    }

    if ((!event.ctrlKey && !event.metaKey) ||
      event.key.toLowerCase() !== 'c' ||
      this.isEditableTarget(event.target) ||
      Boolean(window.getSelection()?.toString()) ||
      !this.selectedNode) {
      return;
    }

    event.preventDefault();
    this.copySelectedNode(event.altKey ? 'path' : 'value');
  };

  private closeMenu(restoreFocus: boolean): void {
    if (!this.menu.classList.contains('is-open')) return;
    this.menu.classList.remove('is-open');

    if (restoreFocus && this.restoreRowFocusOnClose && this.selectedRowIndex !== null) {
      this.svg.querySelector<SVGGElement>(
        `[data-row-index="${this.selectedRowIndex}"][role="button"]`
      )?.focus();
    }

    this.selectedRowIndex = null;
    this.restoreRowFocusOnClose = false;
  }
}
