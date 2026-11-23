/**
 * Maps between JSON paths (JsonPath) and CodeMirror 6 document offsets using Lezer syntax tree.
 */
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import type { JsonPath, JsonPathSegment } from '../json/types';

export interface DocRange {
  from: number;
  to: number;
}

/**
 * Strip quotes from JSON string node text.
 */
function unquote(text: string): string {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    try {
      return JSON.parse(text) as string;
    } catch {
      return text.slice(1, -1);
    }
  }
  return text;
}

/**
 * Find the document offset range for a given JSON path in the CodeMirror editor state.
 */
export function findPathRange(
  state: EditorState,
  path: JsonPath
): DocRange | null {
  const tree = syntaxTree(state);
  let current: SyntaxNode | null = tree.topNode;

  // Descend from JsonText root to its first substantive child (Object, Array, or primitive)
  if (current.name === 'JsonText') {
    current = current.firstChild;
  }

  for (const segment of path) {
    if (!current) return null;

    if (current.name === 'Object') {
      let matched = false;
      const targetKey = String(segment);

      for (let child = current.firstChild; child; child = child.nextSibling) {
        if (child.name === 'Property') {
          const propNameNode = child.getChild('PropertyName');
          if (propNameNode) {
            const rawKey = state.doc.sliceString(propNameNode.from, propNameNode.to);
            if (unquote(rawKey) === targetKey) {
              // Find the value node of the property (skip PropertyName and colon)
              let valNode = propNameNode.nextSibling;
              while (valNode && (valNode.name === ':' || valNode.name === '⚠')) {
                valNode = valNode.nextSibling;
              }
              current = valNode ?? child;
              matched = true;
              break;
            }
          }
        }
      }

      if (!matched) return null;
    } else if (current.name === 'Array') {
      const targetIndex = typeof segment === 'number' ? segment : Number(segment);
      if (Number.isNaN(targetIndex) || targetIndex < 0) return null;

      let itemIndex = 0;
      let matched = false;

      for (let child = current.firstChild; child; child = child.nextSibling) {
        // Skip brackets and commas
        if (
          child.name === '[' ||
          child.name === ']' ||
          child.name === ',' ||
          child.name === '⚠'
        ) {
          continue;
        }

        if (itemIndex === targetIndex) {
          current = child;
          matched = true;
          break;
        }
        itemIndex++;
      }

      if (!matched) return null;
    } else {
      return null;
    }
  }

  if (!current) return null;
  return { from: current.from, to: current.to };
}

/**
 * Resolve the JSON path at a given cursor position in the editor.
 */
export function findPathAtOffset(state: EditorState, pos: number): JsonPath {
  const tree = syntaxTree(state);
  const segments: JsonPathSegment[] = [];
  let node: SyntaxNode | null = tree.resolveInner(pos, -1);

  while (node && node.name !== 'JsonText') {
    const parent: SyntaxNode | null = node.parent;
    if (!parent) break;

    if (parent.name === 'Property') {
      const propNameNode = parent.getChild('PropertyName');
      if (propNameNode) {
        const rawKey = state.doc.sliceString(propNameNode.from, propNameNode.to);
        segments.unshift(unquote(rawKey));
      }
      node = parent.parent; // skip past Property to the enclosing Object
      continue;
    } else if (parent.name === 'Array') {
      if (node.name !== '[' && node.name !== ']' && node.name !== ',') {
        let index = 0;
        for (let sibling = parent.firstChild; sibling && sibling !== node; sibling = sibling.nextSibling) {
          if (
            sibling.name !== '[' &&
            sibling.name !== ']' &&
            sibling.name !== ',' &&
            sibling.name !== '⚠'
          ) {
            index++;
          }
        }
        segments.unshift(index);
      }
    }

    node = parent;
  }

  return segments;
}
