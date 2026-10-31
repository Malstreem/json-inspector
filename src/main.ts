/**
 * JSON Inspector - Main entry point.
 * Wires together the editor, graph model, layout, renderer, and interactions.
 */
import './styles/index.css';
import { createEditor, type EditorInstance } from './editor/setup';
import { buildGraph, collapseAll, expandAll, type GraphNode, type FlatRow } from './graph/model';
import { layoutNode, computeBounds } from './graph/layout';
import { renderGraph, exportSVG } from './graph/render';
import { GraphInteractions, searchNodes } from './graph/interactions';
import { initStatusBar, setNodeCount, setParseTime, setError, clearError } from './ui/status-bar';
import { initPaneResizer } from './ui/pane-resizer';
import { getSampleJSON } from './data/sample';

// ===== State =====
let editor: EditorInstance;
let interactions: GraphInteractions;
let currentRoot: GraphNode | null = null;
let currentFlatRows: FlatRow[] = [];
let searchMatches: number[] = [];
let searchIndex = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ===== DOM Refs =====
const graphGroup = () => document.getElementById('graph-group') as unknown as SVGGElement;
const graphSvg = () => document.getElementById('graph-svg') as unknown as SVGSVGElement;

// ===== Graph Pipeline =====

function parseAndRender(jsonStr: string): void {
  if (!jsonStr.trim()) {
    graphGroup().innerHTML = '';
    setNodeCount(0);
    clearError();
    currentRoot = null;
    currentFlatRows = [];
    return;
  }

  const t0 = performance.now();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    setError((e as Error).message);
    return;
  }
  const parseTime = performance.now() - t0;

  clearError();

  const { root, nodeCount } = buildGraph(parsed);
  currentRoot = root;

  layoutNode(root, 0, 0, 0);
  redraw();

  setNodeCount(nodeCount);
  setParseTime(parseTime);
}

function redraw(): void {
  if (!currentRoot) return;

  // Re-layout from scratch (positions may have changed due to collapse/expand)
  layoutNode(currentRoot, 0, 0, 0);

  const highlightSet = new Set(searchMatches);
  const { svg, flatRows } = renderGraph(currentRoot, highlightSet);
  currentFlatRows = flatRows;

  graphGroup().innerHTML = svg;

  if (interactions) {
    interactions.setFlatRows(flatRows);
  }
}

// ===== Search =====

function handleSearch(query: string): void {
  if (!currentRoot) return;
  // We need flatRows from the current render
  searchMatches = searchNodes(currentFlatRows, query);
  searchIndex = 0;
  redraw();

  if (searchMatches.length > 0) {
    centerOnMatch(searchIndex);
  }
}

function nextSearchMatch(): void {
  if (searchMatches.length === 0) return;
  searchIndex = (searchIndex + 1) % searchMatches.length;
  centerOnMatch(searchIndex);
}

function centerOnMatch(idx: number): void {
  const flatIdx = searchMatches[idx];
  if (flatIdx === undefined || flatIdx >= currentFlatRows.length) return;
  const fr = currentFlatRows[flatIdx];
  interactions.centerOnNode(fr.node);
}

// ===== File Open =====

function openFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    editor.setValue(text);
    parseAndRender(text);
  };
  reader.readAsText(file);
}

// ===== Export SVG =====

function doExportSVG(): void {
  if (!currentRoot) return;
  const bounds = computeBounds(currentRoot);
  const { svg } = renderGraph(currentRoot);
  const svgStr = exportSVG(svg, bounds.width, bounds.height);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'json-inspector-graph.svg';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Format JSON =====

function formatJSON(): void {
  const text = editor.getValue();
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    editor.setValue(formatted);
    clearError();
  } catch (e) {
    setError((e as Error).message);
  }
}

// ===== Init =====

function init(): void {
  initStatusBar();
  initPaneResizer();

  // Create editor
  const editorContainer = document.getElementById('editor-container')!;
  const initialJSON = getSampleJSON();

  editor = createEditor(editorContainer, initialJSON, (content) => {
    // Debounce parse
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => parseAndRender(content), 200);
  });

  // Setup graph interactions
  const svg = graphSvg();
  const group = graphGroup();
  interactions = new GraphInteractions(svg, group, {
    onToggleRow: () => redraw(),
    onViewportChange: () => {},
  });

  // Initial render
  parseAndRender(initialJSON);

  // Fit to view after initial render
  if (currentRoot) {
    const bounds = computeBounds(currentRoot);
    interactions.fitToView(bounds);
  }

  // ===== Wire up buttons =====

  // Format
  document.getElementById('btn-format')?.addEventListener('click', formatJSON);

  // Sample
  document.getElementById('btn-sample')?.addEventListener('click', () => {
    const sample = getSampleJSON();
    editor.setValue(sample);
    parseAndRender(sample);
    if (currentRoot) {
      const bounds = computeBounds(currentRoot);
      interactions.fitToView(bounds);
    }
  });

  // Open file
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  document.getElementById('btn-open')?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) openFile(file);
    fileInput.value = '';
  });

  // Fit
  document.getElementById('btn-fit')?.addEventListener('click', () => {
    if (currentRoot) {
      const bounds = computeBounds(currentRoot);
      interactions.fitToView(bounds);
    }
  });

  // Collapse / Expand
  document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
    if (currentRoot) {
      collapseAll(currentRoot);
      redraw();
    }
  });

  document.getElementById('btn-expand-all')?.addEventListener('click', () => {
    if (currentRoot) {
      expandAll(currentRoot);
      redraw();
      if (currentRoot) {
        const bounds = computeBounds(currentRoot);
        interactions.fitToView(bounds);
      }
    }
  });

  // Zoom
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => interactions.zoomIn());
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => interactions.zoomOut());

  // Export
  document.getElementById('btn-export')?.addEventListener('click', doExportSVG);

  // Search
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => handleSearch(searchInput.value), 150);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchMatches.length === 0) {
        handleSearch(searchInput.value);
      } else {
        nextSearchMatch();
      }
    }
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchMatches = [];
      searchIndex = 0;
      redraw();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + F: focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      // Don't prevent default if editor is focused (let CM handle it)
      if (!editorContainer.contains(document.activeElement)) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
    // Ctrl/Cmd + Shift + F: format
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      formatJSON();
    }
  });
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
