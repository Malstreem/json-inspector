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
import { BreadcrumbsView } from './ui/breadcrumbs';
import { TypesDialogView } from './ui/types-dialog';
import { FetchDialogView } from './ui/fetch-dialog';
import { createShareUrl, getJsonFromHash } from './files/url-share';
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
  const searchCounter = requireElement<HTMLElement>('#search-counter');
  const btnSearchPrev = requireElement<HTMLButtonElement>('#btn-search-prev');
  const btnSearchNext = requireElement<HTMLButtonElement>('#btn-search-next');
  const btnSearchFilter = requireElement<HTMLButtonElement>('#btn-search-filter');
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
    types: requireElement<HTMLButtonElement>('#btn-types'),
    fetch: requireElement<HTMLButtonElement>('#btn-fetch'),
    share: requireElement<HTMLButtonElement>('#btn-share'),
  };
  const hashJson = getJsonFromHash();
  const initialJson = hashJson ?? getSampleJSON();

  const typesDialog = new TypesDialogView(
    {
      dialog: requireElement<HTMLDialogElement>('#types-dialog'),
      rootNameInput: requireElement<HTMLInputElement>('#types-root-name'),
      typeAliasCheckbox: requireElement<HTMLInputElement>('#types-use-type'),
      codeBlock: requireElement<HTMLElement>('#types-code-block'),
      btnCopy: requireElement<HTMLButtonElement>('#btn-copy-types'),
      btnClose: requireElement<HTMLButtonElement>('#btn-close-types'),
    },
    () => editor.getValue(),
    setCopyStatus
  );

  const fetchDialog = new FetchDialogView(
    {
      dialog: requireElement<HTMLDialogElement>('#fetch-dialog'),
      urlInput: requireElement<HTMLInputElement>('#fetch-url-input'),
      presetButtons: document.querySelectorAll<HTMLButtonElement>('.preset-tag'),
      btnSubmit: requireElement<HTMLButtonElement>('#btn-submit-fetch'),
      btnClose: requireElement<HTMLButtonElement>('#btn-close-fetch'),
      statusEl: requireElement<HTMLElement>('#fetch-status'),
    },
    {
      onLoaded: (content, sourceName) => {
        if (isDestroyed) return;
        editor.setValue(content);
        void updateDocument(content).then(() => {
          if (!isDestroyed) {
            controller.fitToView();
            setCopyStatus(`Fetched from ${sourceName}`, false);
          }
        });
      },
      onError: (message) => {
        if (!isDestroyed) setError(message);
      },
    }
  );

  const breadcrumbBar = requireElement<HTMLElement>('#breadcrumb-bar');
  const btnCopyBreadcrumb = document.querySelector<HTMLButtonElement>('#btn-copy-breadcrumb');
  const breadcrumbs = new BreadcrumbsView(breadcrumbBar, btnCopyBreadcrumb, {
    onNavigatePath: (path) => {
      if (isDestroyed) return;
      editor.selectPath(path);
      controller.highlightPath(path);
      breadcrumbs.setPath(path);
    },
    onCopyStatus: setCopyStatus,
  });

  let controller: InspectorController;
  const graphView = new GraphView(
    requireElement<SVGSVGElement>('#graph-svg'),
    requireElement<SVGGElement>('#graph-group'),
    () => controller.refresh(),
    setCopyStatus,
    (path) => {
      if (!isDestroyed) {
        editor.selectPath(path);
        breadcrumbs.setPath(path);
      }
    }
  );
  controller = new InspectorController(graphView, {
    onNodeCount: setNodeCount,
    onProcessingTime: setProcessingTime,
    onError: (message) => {
      if (message === null) clearError();
      else setError(message);
    },
    onSearchMatchChange: (current, total) => {
      if (total === 0) {
        searchCounter.textContent = searchInput.value ? '0/0' : '';
        btnSearchPrev.hidden = true;
        btnSearchNext.hidden = true;
      } else {
        searchCounter.textContent = `${current}/${total}`;
        btnSearchPrev.hidden = false;
        btnSearchNext.hidden = false;
      }
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
        breadcrumbs.setPath(path);
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
    if (!isDestroyed && editor.getValue() === initialJson) {
      controller.fitToView();
      if (hashJson) {
        setCopyStatus('Loaded JSON from shared link', false);
      }
    }
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
  buttons.types.addEventListener('click', () => typesDialog.show(), { signal });
  buttons.fetch.addEventListener('click', () => fetchDialog.show(), { signal });
  buttons.share.addEventListener('click', () => {
    const content = editor.getValue();
    const result = createShareUrl(content);
    if (result.isTooLarge) {
      setError('Document is too large to share via URL link (>64 KB).');
      return;
    }
    navigator.clipboard
      .writeText(result.url)
      .then(() => {
        history.replaceState(null, '', result.url);
        setCopyStatus('Share link copied to clipboard!', false);
      })
      .catch(() => {
        setError('Failed to copy share link');
      });
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
      if (event.shiftKey) {
        controller.prevSearchMatch(searchInput.value);
      } else {
        controller.nextSearchMatch(searchInput.value);
      }
    } else if (event.key === 'Escape') {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = null;
      searchInput.value = '';
      controller.search('');
    }
  }, { signal });

  btnSearchPrev.addEventListener('click', () => {
    controller.prevSearchMatch(searchInput.value);
  }, { signal });

  btnSearchNext.addEventListener('click', () => {
    controller.nextSearchMatch(searchInput.value);
  }, { signal });

  btnSearchFilter.addEventListener('click', () => {
    const isFiltered = controller.toggleFilterMode();
    btnSearchFilter.setAttribute('aria-pressed', String(isFiltered));
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

    if (event.altKey && event.key.toLowerCase() === 't') {
      event.preventDefault();
      typesDialog.show();
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
