/**
 * Status bar management.
 */

const els = {
  nodes: null as HTMLElement | null,
  parseTime: null as HTMLElement | null,
  error: null as HTMLElement | null,
  copyStatus: null as HTMLElement | null,
};

export function initStatusBar(): void {
  els.nodes = document.getElementById('status-nodes');
  els.parseTime = document.getElementById('status-parse-time');
  els.error = document.getElementById('status-error');
  els.copyStatus = document.getElementById('status-copy');
}

export function setNodeCount(count: number): void {
  if (els.nodes) els.nodes.textContent = `Nodes: ${count}`;
}

export function setParseTime(ms: number): void {
  if (els.parseTime) {
    els.parseTime.textContent = ms >= 1 ? `${ms.toFixed(1)} ms` : `${(ms * 1000).toFixed(0)} μs`;
  }
}

export function setError(msg: string): void {
  if (els.error) {
    els.error.textContent = msg;
    els.error.title = msg;
  }
}

export function clearError(): void {
  if (els.error) {
    els.error.textContent = '';
    els.error.title = '';
  }
}

export function setCopyStatus(message: string, isError: boolean): void {
  if (!els.copyStatus) return;
  els.copyStatus.textContent = message;
  els.copyStatus.classList.toggle('is-error', isError);
}
