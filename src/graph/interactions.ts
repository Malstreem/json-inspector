/**
 * Graph interaction handling: pan, zoom, search, click.
 */
import type { GraphNode, FlatRow, Row } from './model';
import { toggleRow } from './model';
import type { BoundingBox } from './layout';

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

export class GraphInteractions {
  private readonly svg: SVGSVGElement;
  private readonly group: SVGGElement;
  private state: ViewportState = { panX: 40, panY: 40, zoom: 1 };
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private readonly onToggleRow: (row: Row) => void;
  private flatRows: FlatRow[] = [];
  private readonly eventController = new AbortController();

  constructor(
    svg: SVGSVGElement,
    group: SVGGElement,
    onToggleRow: (row: Row) => void
  ) {
    this.svg = svg;
    this.group = group;
    this.onToggleRow = onToggleRow;
    this.bindEvents();
    this.applyTransform();
  }

  setFlatRows(rows: FlatRow[]): void {
    this.flatRows = rows;
  }

  private bindEvents(): void {
    const { signal } = this.eventController;

    // Pan
    this.svg.addEventListener('mousedown', this.onMouseDown, { signal });
    document.addEventListener('mousemove', this.onMouseMove, { signal });
    document.addEventListener('mouseup', this.onMouseUp, { signal });

    // Zoom
    this.svg.addEventListener('wheel', this.onWheel, { passive: false, signal });

    // Click (event delegation for row toggles)
    this.svg.addEventListener('click', this.onClick, { signal });
    this.svg.addEventListener('keydown', this.onKeyDown, { signal });

    // Touch support
    this.svg.addEventListener('touchstart', this.onTouchStart, { passive: false, signal });
    this.svg.addEventListener('touchmove', this.onTouchMove, { passive: false, signal });
    this.svg.addEventListener('touchend', this.onTouchEnd, { signal });
  }

  private onMouseDown = (e: MouseEvent): void => {
    // Let graph items handle their own clicks without starting a pan.
    if (!(e.target instanceof Element)) return;
    const target = e.target;
    if (target.closest('[data-row-index], [data-node-index]')) return;

    this.isPanning = true;
    this.panStart = { x: e.clientX - this.state.panX, y: e.clientY - this.state.panY };
    this.svg.style.cursor = 'grabbing';
    e.preventDefault();
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isPanning) return;
    this.state.panX = e.clientX - this.panStart.x;
    this.state.panY = e.clientY - this.panStart.y;
    this.applyTransform();
  };

  private onMouseUp = (): void => {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.svg.style.cursor = '';
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    this.zoomAtPoint(this.state.zoom + delta, mouseX, mouseY);
  };

  private onClick = (e: MouseEvent): void => {
    if (!(e.target instanceof Element)) return;
    const target = e.target;
    const rowEl = target.closest('[data-row-index]');
    if (!rowEl) return;

    this.toggleRowAtElement(rowEl, false);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!(e.target instanceof Element)) return;
    const rowEl = e.target.closest('[data-row-index][role="button"]');
    if (!rowEl) return;

    e.preventDefault();
    this.toggleRowAtElement(rowEl, true);
  };

  private toggleRowAtElement(element: Element, restoreFocus: boolean): void {
    const index = Number(element.getAttribute('data-row-index'));
    if (!Number.isInteger(index) || index < 0 || index >= this.flatRows.length) return;

    const fr = this.flatRows[index];
    if (toggleRow(fr.row)) {
      this.onToggleRow(fr.row);
      if (restoreFocus) {
        this.svg.querySelector<SVGGElement>(`[data-row-index="${index}"][role="button"]`)?.focus();
      }
    }
  }

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.isPanning = true;
      this.panStart = { x: touch.clientX - this.state.panX, y: touch.clientY - this.state.panY };
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isPanning || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.state.panX = touch.clientX - this.panStart.x;
    this.state.panY = touch.clientY - this.panStart.y;
    this.applyTransform();
  };

  private onTouchEnd = (): void => {
    this.isPanning = false;
  };

  private applyTransform(): void {
    this.group.setAttribute(
      'transform',
      `translate(${this.state.panX}, ${this.state.panY}) scale(${this.state.zoom})`
    );
  }

  private zoomAtPoint(nextZoom: number, x: number, y: number): void {
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    const scale = zoom / this.state.zoom;
    this.state.panX = x - (x - this.state.panX) * scale;
    this.state.panY = y - (y - this.state.panY) * scale;
    this.state.zoom = zoom;
    this.applyTransform();
  }

  /** Zoom in by one step */
  zoomIn(): void {
    const rect = this.svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    this.zoomAtPoint(this.state.zoom + ZOOM_STEP, cx, cy);
  }

  /** Zoom out by one step */
  zoomOut(): void {
    const rect = this.svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    this.zoomAtPoint(this.state.zoom - ZOOM_STEP, cx, cy);
  }

  /** Fit the entire graph into the viewport */
  fitToView(bounds: BoundingBox): void {
    const rect = this.svg.getBoundingClientRect();
    const padding = 60;
    const availW = rect.width - padding * 2;
    const availH = rect.height - padding * 2;

    if (bounds.width === 0 || bounds.height === 0) {
      this.state = { panX: 40, panY: 40, zoom: 1 };
    } else {
      const scaleX = availW / bounds.width;
      const scaleY = availH / bounds.height;
      const zoom = Math.min(scaleX, scaleY, 1.5);

      this.state.zoom = zoom;
      this.state.panX = padding - bounds.minX * zoom + (availW - bounds.width * zoom) / 2;
      this.state.panY = padding - bounds.minY * zoom + (availH - bounds.height * zoom) / 2;
    }

    this.applyTransform();
  }

  /** Center the view on a specific node */
  centerOnNode(node: GraphNode): void {
    const rect = this.svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    this.state.panX = cx - (node.x + node.width / 2) * this.state.zoom;
    this.state.panY = cy - (node.y + node.height / 2) * this.state.zoom;
    this.applyTransform();
  }

  destroy(): void {
    this.eventController.abort();
    this.svg.style.cursor = '';
  }
}
