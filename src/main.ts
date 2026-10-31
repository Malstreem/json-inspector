import './styles/index.css';
import { InspectorController } from './app/inspector-controller';
import { createEditor } from './editor/setup';
import { downloadGraphSvg } from './files/download-svg';
import { readJsonFile } from './files/read-json-file';
import { GraphView } from './graph/view';
import { clearError, initStatusBar, setError, setNodeCount, setParseTime } from './ui/status-bar';
import { initPaneResizer } from './ui/pane-resizer';
import { getSampleJSON } from './data/sample';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required application element not found: ${selector}`);
  }
  return element;
}

function init(): void {
  initStatusBar();
  initPaneResizer();

  const editorContainer = requireElement<HTMLDivElement>('#editor-container');
  const fileInput = requireElement<HTMLInputElement>('#file-input');
  const searchInput = requireElement<HTMLInputElement>('#search-input');
  const initialJson = getSampleJSON();

  let controller: InspectorController;
  const graphView = new GraphView(
    requireElement<SVGSVGElement>('#graph-svg'),
    requireElement<SVGGElement>('#graph-group'),
    () => controller.refresh()
  );
  controller = new InspectorController(graphView, {
    onNodeCount: setNodeCount,
    onParseTime: setParseTime,
    onError: (message) => message === null ? clearError() : setError(message),
  });

  let documentTimer: ReturnType<typeof setTimeout> | null = null;
  const editor = createEditor(editorContainer, initialJson, (source) => {
    if (documentTimer) clearTimeout(documentTimer);
    documentTimer = setTimeout(() => updateDocument(source), 200);
  });

  function updateDocument(source: string): void {
    if (documentTimer) clearTimeout(documentTimer);
    documentTimer = null;
    controller.setDocument(source);
  }

  controller.setDocument(initialJson);
  controller.fitToView();

  document.getElementById('btn-format')?.addEventListener('click', () => {
    const formatted = controller.formatDocument(editor.getValue());
    if (formatted !== null) editor.setValue(formatted);
  });

  document.getElementById('btn-sample')?.addEventListener('click', () => {
    const sample = getSampleJSON();
    editor.setValue(sample);
    updateDocument(sample);
    controller.fitToView();
  });

  document.getElementById('btn-open')?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      void readJsonFile(file)
        .then((source) => {
          editor.setValue(source);
          updateDocument(source);
        })
        .catch((error: unknown) => {
          const detail = error instanceof Error ? `: ${error.message}` : '';
          setError(`Unable to read ${file.name}${detail}`);
        });
    }
    fileInput.value = '';
  });

  document.getElementById('btn-fit')?.addEventListener('click', () => controller.fitToView());
  document.getElementById('btn-collapse-all')?.addEventListener('click', () => controller.collapseAll());
  document.getElementById('btn-expand-all')?.addEventListener('click', () => controller.expandAll());
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => graphView.zoomIn());
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => graphView.zoomOut());
  document.getElementById('btn-export')?.addEventListener('click', () => {
    const root = controller.getRoot();
    if (root) downloadGraphSvg(root);
  });

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => controller.search(searchInput.value), 150);
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = null;
      controller.nextSearchMatch(searchInput.value);
    } else if (event.key === 'Escape') {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = null;
      searchInput.value = '';
      controller.search('');
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      if (!editorContainer.contains(document.activeElement)) {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === 'f'
    ) {
      event.preventDefault();
      const formatted = controller.formatDocument(editor.getValue());
      if (formatted !== null) editor.setValue(formatted);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
