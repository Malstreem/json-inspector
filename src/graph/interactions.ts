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

export interface InteractionCallbacks {
  onToggleRow: (row: Row) => void;
  onViewportChange: (state: ViewportState) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

export class GraphInteractions {
  private svg: SVGSVGElement;
  private group: SVGGElement;
  private state: ViewportState = { panX: 40, panY: 40, zoom: 1 };
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private callbacks: InteractionCallbacks;
  private flatRows: FlatRow[] = [];

  constructor(
    svg: SVGSVGElement,
    group: SVGGElement,
    callbacks: InteractionCallbacks
  ) {
    this.svg = svg;
    this.group = group;
    this.callbacks = callbacks;
    this.bindEvents();
    this.applyTransform();
  }

  setFlatRows(rows: FlatRow[]): void {
    this.flatRows = rows;
  }

  private bindEvents(): void {
    // Pan
    this.svg.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    // Zoom
    this.svg.addEventListener('wheel', this.onWheel, { passive: false });

    // Click (event delegation for row toggles)
    this.svg.addEventListener('click', this.onClick);

    // Touch support
    this.svg.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.svg.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.svg.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    // Ignore if clicking on a data-r element (row click)
    const target = e.target as Element;
    if (target.closest('[data-r]')) return;

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

    const oldZoom = this.state.zoom;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom + delta));

    // Zoom toward cursor
    const scale = newZoom / oldZoom;
    this.state.panX = mouseX - (mouseX - this.state.panX) * scale;
    this.state.panY = mouseY - (mouseY - this.state.panY) * scale;
    this.state.zoom = newZoom;

    this.applyTransform();
    this.callbacks.onViewportChange(this.state);
  };

  private onClick = (e: MouseEvent): void => {
    const target = e.target as Element;
    const rowEl = target.closest('[data-r]');
    if (!rowEl) return;

    const idx = parseInt(rowEl.getAttribute('data-r')!, 10);
    if (isNaN(idx) || idx >= this.flatRows.length) return;

    const fr = this.flatRows[idx];
    if (toggleRow(fr.row)) {
      this.callbacks.onToggleRow(fr.row);
    }
  };

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

  /** Zoom in by one step */
  zoomIn(): void {
    const rect = this.svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldZoom = this.state.zoom;
    const newZoom = Math.min(MAX_ZOOM, oldZoom + ZOOM_STEP);
    const scale = newZoom / oldZoom;
    this.state.panX = cx - (cx - this.state.panX) * scale;
    this.state.panY = cy - (cy - this.state.panY) * scale;
    this.state.zoom = newZoom;
    this.applyTransform();
  }

  /** Zoom out by one step */
  zoomOut(): void {
    const rect = this.svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldZoom = this.state.zoom;
    const newZoom = Math.max(MIN_ZOOM, oldZoom - ZOOM_STEP);
    const scale = newZoom / oldZoom;
    this.state.panX = cx - (cx - this.state.panX) * scale;
    this.state.panY = cy - (cy - this.state.panY) * scale;
    this.state.zoom = newZoom;
    this.applyTransform();
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
    this.callbacks.onViewportChange(this.state);
  }

  /** Center the view on a specific node */
  centerOnNode(node: GraphNode): void {
    const rect = this.svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    this.state.panX = cx - (node.x + node.w / 2) * this.state.zoom;
    this.state.panY = cy - (node.y + node.h / 2) * this.state.zoom;
    this.applyTransform();
  }

  getState(): ViewportState {
    return { ...this.state };
  }

  destroy(): void {
    this.svg.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.svg.removeEventListener('wheel', this.onWheel);
    this.svg.removeEventListener('click', this.onClick);
    this.svg.removeEventListener('touchstart', this.onTouchStart);
    this.svg.removeEventListener('touchmove', this.onTouchMove);
    this.svg.removeEventListener('touchend', this.onTouchEnd);
  }
}
