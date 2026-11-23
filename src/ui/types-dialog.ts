/**
 * TypeScript Generation Dialog UI.
 */
import { jsonToTypeScript, type TypeScriptGenOptions } from '../schema/to-typescript';

export interface TypesDialogElements {
  dialog: HTMLDialogElement;
  rootNameInput: HTMLInputElement;
  typeAliasCheckbox: HTMLInputElement;
  codeBlock: HTMLElement;
  btnCopy: HTMLButtonElement;
  btnClose: HTMLButtonElement;
}

export class TypesDialogView {
  private readonly elements: TypesDialogElements;
  private readonly getCurrentJson: () => string;
  private readonly onCopyStatus: (message: string, isError: boolean) => void;

  constructor(
    elements: TypesDialogElements,
    getCurrentJson: () => string,
    onCopyStatus: (message: string, isError: boolean) => void
  ) {
    this.elements = elements;
    this.getCurrentJson = getCurrentJson;
    this.onCopyStatus = onCopyStatus;

    this.bindEvents();
  }

  private bindEvents(): void {
    const { dialog, rootNameInput, typeAliasCheckbox, btnCopy, btnClose } = this.elements;

    rootNameInput.addEventListener('input', () => this.generate());
    typeAliasCheckbox.addEventListener('change', () => this.generate());

    btnCopy.addEventListener('click', () => {
      const code = this.elements.codeBlock.textContent ?? '';
      if (!code) return;

      navigator.clipboard
        .writeText(code)
        .then(() => {
          this.onCopyStatus('Copied TypeScript types', false);
          btnCopy.textContent = 'Copied!';
          setTimeout(() => {
            btnCopy.textContent = 'Copy TypeScript';
          }, 1500);
        })
        .catch(() => {
          this.onCopyStatus('Failed to copy types', true);
        });
    });

    btnClose.addEventListener('click', () => {
      dialog.close();
    });

    // Close on backdrop click
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  }

  show(): void {
    this.generate();
    this.elements.dialog.showModal();
  }

  private generate(): void {
    const jsonStr = this.getCurrentJson();
    if (!jsonStr.trim()) {
      this.elements.codeBlock.textContent = '// No JSON data loaded';
      return;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const options: TypeScriptGenOptions = {
        rootName: this.elements.rootNameInput.value.trim() || 'Root',
        useTypeAlias: this.elements.typeAliasCheckbox.checked,
        exportTypes: true,
      };
      const tsCode = jsonToTypeScript(parsed, options);
      this.elements.codeBlock.textContent = tsCode;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      this.elements.codeBlock.textContent = `// Error parsing JSON:\n// ${detail}`;
    }
  }
}
