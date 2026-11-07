import './styles/index.css';
import { InspectorController } from './app/inspector-controller';
import { createEditor } from './editor/setup';
import { downloadGraphSvg } from './files/download-svg';
import { GraphView } from './graph/view';
import {
  setProcessingTime,
  initStatusBar,
  setCopyStatus,
  setNodeCount,
  clearError,
  setError,
} from './ui/status-bar';
import { initPaneResizer } from './ui/pane-resizer';
import { getSampleJSON } from './data/sample';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required application element not found: ${selector}`);
  }
  return element;
}

function init(): () => void {
  initStatusBar();
  const destroyPaneResizer = initPaneResizer();
  const appEvents = new AbortController();
  const { signal } = appEvents;

  const editorContainer = requireElement<HTMLDivElement>('#editor-container');
  const fileInput = requireElement<HTMLInputElement>('#file-input');
  const searchInput = requireElement<HTMLInputElement>('#search-input');
  const buttons = {
    format: requireElement<HTMLButtonElement>('#btn-format'),
    sample: requireElement<HTMLButtonElement>('#btn-sample'),
    open: requireElement<HTMLButtonElement>('#btn-open'),
    fit: requireElement<HTMLButtonElement>('#btn-fit'),
    collapseAll: requireElement<HTMLButtonElement>('#btn-collapse-all'),
    expandAll: requireElement<HTMLButtonElement>('#btn-expand-all'),
    zoomIn: requireElement<HTMLButtonElement>('#btn-zoom-in'),
    zoomOut: requireElement<HTMLButtonElement>('#btn-zoom-out'),
    export: requireElement<HTMLButtonElement>('#btn-export'),
  };
  const initialJson = getSampleJSON();

  let controller: InspectorController;
  const graphView = new GraphView(
    requireElement<SVGSVGElement>('#graph-svg'),
    requireElement<SVGGElement>('#graph-group'),
    () => controller.refresh(),
    setCopyStatus
  );
  controller = new InspectorController(graphView, {
    onNodeCount: setNodeCount,
    onProcessingTime: setProcessingTime,
    onError: (message) => {
      if (message === null) clearError();
      else setError(message);
    },
  });

  let documentTimer: ReturnType<typeof setTimeout> | null = null;
  const editor = createEditor(editorContainer, initialJson, (source) => {
    controller.invalidatePendingRequests();
    if (documentTimer) clearTimeout(documentTimer);
    documentTimer = setTimeout(() => updateDocument(source), 200);
  });
  let isDestroyed = false;

  function updateDocument(source: string): Promise<void> {
    if (documentTimer) clearTimeout(documentTimer);
    documentTimer = null;
    return controller.setDocument(source);
  }

  void updateDocument(initialJson).then(() => {
    if (!isDestroyed && editor.getValue() === initialJson) controller.fitToView();
  });

  buttons.format.addEventListener('click', () => {
    void controller.formatDocument(editor.getValue()).then((formatted) => {
      if (!isDestroyed && formatted !== null) editor.setValue(formatted);
    });
  }, { signal });

  buttons.sample.addEventListener('click', () => {
    const sample = getSampleJSON();
    editor.setValue(sample);
    void updateDocument(sample).then(() => {
      if (!isDestroyed && editor.getValue() === sample) controller.fitToView();
    });
  }, { signal });

  buttons.open.addEventListener('click', () => fileInput.click(), { signal });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      void file.text()
        .then((source) => {
          if (isDestroyed) return;
          editor.setValue(source);
          updateDocument(source);
        })
        .catch((error: unknown) => {
          if (isDestroyed) return;
          const detail = error instanceof Error ? `: ${error.message}` : '';
          setError(`Unable to read ${file.name}${detail}`);
        });
    }
    fileInput.value = '';
  }, { signal });

  buttons.fit.addEventListener('click', () => controller.fitToView(), { signal });
  buttons.collapseAll.addEventListener('click', () => controller.collapseAll(), { signal });
  buttons.expandAll.addEventListener('click', () => controller.expandAll(), { signal });
  buttons.zoomIn.addEventListener('click', () => graphView.zoomIn(), { signal });
  buttons.zoomOut.addEventListener('click', () => graphView.zoomOut(), { signal });
  buttons.export.addEventListener('click', () => {
    const root = controller.getRoot();
    if (root) downloadGraphSvg(root);
  }, { signal });

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => controller.search(searchInput.value), 150);
  }, { signal });
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
  }, { signal });

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
      void controller.formatDocument(editor.getValue()).then((content) => {
        if (!isDestroyed && content !== null) editor.setValue(content);
      });
    }
  }, { signal });

  return () => {
    if (isDestroyed) return;
    isDestroyed = true;
    appEvents.abort();
    if (documentTimer) clearTimeout(documentTimer);
    if (searchTimer) clearTimeout(searchTimer);
    editor.destroy();
    graphView.destroy();
    controller.destroy();
    destroyPaneResizer();
  };
}

function startApp(): void {
  const destroy = init();
  window.addEventListener('pagehide', destroy, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, { once: true });
} else {
  startApp();
}
