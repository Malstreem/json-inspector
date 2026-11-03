/**
 * CodeMirror 6 editor setup for JSON editing.
 */
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle, indentOnInput } from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

/** Dark theme matching the JSON Inspector design */
const inspectorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace",
    caretColor: '#a78bfa',
    padding: '8px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#a78bfa',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
  },
  '.cm-panels': {
    backgroundColor: '#221d30',
    color: '#e0ddd5',
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '1px solid #3d3555',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    outline: '1px solid rgba(255, 215, 0, 0.5)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(167, 139, 250, 0.04)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'rgba(167, 139, 250, 0.25)',
    color: '#a78bfa',
  },
  '.cm-gutters': {
    backgroundColor: '#221d30',
    color: '#6b6375',
    borderRight: '1px solid #3d3555',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2540',
    color: '#9a95a8',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#2a2540',
    color: '#a78bfa',
    border: '1px solid #3d3555',
  },
  '.cm-tooltip': {
    backgroundColor: '#2a2540',
    border: '1px solid #3d3555',
    color: '#e0ddd5',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: 'rgba(167, 139, 250, 0.15)',
    },
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace",
  },
}, { dark: true });

/** The base background as a highlight style won't cover */
const baseTheme = EditorView.baseTheme({
  '&.cm-editor': {
    backgroundColor: '#1a1625',
  },
});

export interface EditorInstance {
  getValue: () => string;
  setValue: (content: string) => void;
  destroy: () => void;
}

/**
 * Create and mount a CodeMirror 6 editor.
 * @param container - DOM element to mount the editor in
 * @param initialContent - Initial text content
 * @param onChange - Callback fired on content changes (debounced externally)
 */
export function createEditor(
  container: HTMLElement,
  initialContent: string,
  onChange: (content: string) => void
): EditorInstance {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  });

  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    foldGutter(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightSelectionMatches(),
    json(),
    linter(jsonParseLinter()),
    lintGutter(),
    inspectorTheme,
    baseTheme,
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    updateListener,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      indentWithTab,
    ]),
    EditorView.lineWrapping,
  ];

  const state = EditorState.create({
    doc: initialContent,
    extensions,
  });

  const view = new EditorView({
    state,
    parent: container,
  });

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (content: string) => {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    },
    destroy: () => view.destroy(),
  };
}
