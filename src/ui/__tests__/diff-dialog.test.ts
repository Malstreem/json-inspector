// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { DiffDialogView, type DiffDialogElements } from '../diff-dialog';

describe('DiffDialogView', () => {
  function createElements(): DiffDialogElements {
    const dialog = document.createElement('dialog');
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    return {
      dialog,
      inputA: document.createElement('textarea'),
      inputB: document.createElement('textarea'),
      btnUseCurrent: document.createElement('button'),
      btnSwap: document.createElement('button'),
      btnCompare: document.createElement('button'),
      btnClose: document.createElement('button'),
      summaryEl: document.createElement('div'),
      resultsEl: document.createElement('div'),
    };
  }

  it('renders diff entries and summary counts', () => {
    const els = createElements();
    els.inputA.value = '{"a": 1, "b": 2}';
    els.inputB.value = '{"a": 1, "b": 3, "c": 4}';

    const view = new DiffDialogView(els, {
      getCurrentJson: () => '{"a": 1}',
    });
    view.compare();

    expect(els.summaryEl.textContent).toContain('+1 added');
    expect(els.summaryEl.textContent).toContain('~1 changed');
    expect(els.resultsEl.children).toHaveLength(2);
  });

  it('navigates to path and closes when a diff item is clicked', () => {
    const els = createElements();
    els.inputA.value = '{"x": 1}';
    els.inputB.value = '{"x": 2}';
    const onSelectPath = vi.fn();

    const view = new DiffDialogView(els, {
      getCurrentJson: () => '{"x": 1}',
      onSelectPath,
    });
    view.compare();

    (els.resultsEl.children[0] as HTMLButtonElement).click();
    expect(onSelectPath).toHaveBeenCalledWith(['x']);
    expect(els.dialog.close).toHaveBeenCalled();
  });
});
