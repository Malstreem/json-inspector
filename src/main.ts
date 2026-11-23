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
import { initFileDropAndPaste } from './ui/drop-overlay';
import { getSampleJSON } from './data/sample';

/**
 * VK_PROCESSKEY (229): Virtual key code emitted when an Input Method Editor (IME)
 * is actively composing or confirming candidate text (e.g. CJK character input).
 * Checked alongside `event.isComposing` to account for Safari's event-ordering quirk.
 */
const VK_PROCESSKEY = 229;

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

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isMac) {
    document.querySelectorAll<HTMLElement>('[data-platform-mod]').forEach((el) => {
      el.textContent = '⌘';
    });
  }

  const editorContainer = requireElement<HTMLDivElement>('#editor-container');
  const fileInput = requireElement<HTMLInputElement>('#file-input');
  const searchInput = requireElement<HTMLInputElement>('#search-input');
  const dropOverlay = requireElement<HTMLDivElement>('#drop-overlay');
  const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');
  const btnHelp = document.querySelector<HTMLButtonElement>('#btn-help');
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
    setCopyStatus,
    (path) => {
      if (!isDestroyed) editor.selectPath(path);
    }
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
  let cursorPathTimer: ReturnType<typeof setTimeout> | null = null;
  const editor = createEditor(editorContainer, {
    initialContent: initialJson,
    onChange: (source) => {
      controller.invalidatePendingRequests();
      if (documentTimer) clearTimeout(documentTimer);
      documentTimer = setTimeout(() => updateDocument(source), 200);
    },
    onCursorPath: (path) => {
      if (isDestroyed) return;
      if (cursorPathTimer) clearTimeout(cursorPathTimer);
      cursorPathTimer = setTimeout(() => {
        controller.highlightPath(path);
      }, 250);
    },
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

  const destroyDropAndPaste = initFileDropAndPaste(dropOverlay, {
    onJsonLoaded: (content, sourceName) => {
      if (isDestroyed) return;
      editor.setValue(content);
      void updateDocument(content).then(() => {
        if (!isDestroyed) {
          controller.fitToView();
          setCopyStatus(`Loaded from ${sourceName}`, false);
        }
      });
    },
    onError: (message) => {
      if (!isDestroyed) setError(message);
    },
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
      if (event.isComposing || event.keyCode === VK_PROCESSKEY) {
        return;
      }
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

  if (helpDialog && btnHelp && !('commandForElement' in HTMLButtonElement.prototype)) {
    btnHelp.addEventListener('click', () => {
      helpDialog.showModal();
    }, { signal });
  }

  if (helpDialog && !('closedBy' in HTMLDialogElement.prototype)) {
    helpDialog.addEventListener('click', (event) => {
      if (event.target === helpDialog) {
        helpDialog.close();
      }
    }, { signal });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const active = document.activeElement;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        Boolean(active?.closest('.cm-editor'));
      if (!isInput && helpDialog && !helpDialog.open) {
        event.preventDefault();
        helpDialog.showModal();
      }
    }

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
    if (cursorPathTimer) clearTimeout(cursorPathTimer);
    if (searchTimer) clearTimeout(searchTimer);
    editor.destroy();
    graphView.destroy();
    controller.destroy();
    destroyPaneResizer();
    destroyDropAndPaste();
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
