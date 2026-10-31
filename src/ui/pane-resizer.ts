/**
 * Pane resizer: draggable divider between editor and graph panes.
 */
export function initPaneResizer(): void {
  const resizer = document.querySelector<HTMLElement>('.pane-resizer');
  const editorPane = document.querySelector<HTMLElement>('.editor-pane');
  if (!resizer || !editorPane) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener('mousedown', (e: MouseEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = editorPane.offsetWidth;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const newWidth = Math.max(250, Math.min(startWidth + dx, window.innerWidth - 300));
    editorPane.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // Keyboard support
  resizer.addEventListener('keydown', (e: KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 10;
    if (e.key === 'ArrowLeft') {
      editorPane.style.width = `${Math.max(250, editorPane.offsetWidth - step)}px`;
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      editorPane.style.width = `${Math.min(editorPane.offsetWidth + step, window.innerWidth - 300)}px`;
      e.preventDefault();
    }
  });
}
