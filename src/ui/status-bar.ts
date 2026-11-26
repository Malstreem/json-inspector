/**
 * Status bar management.
 */

const els = {
  nodes: null as HTMLElement | null,
  processingTime: null as HTMLElement | null,
  size: null as HTMLElement | null,
  depth: null as HTMLElement | null,
  error: null as HTMLElement | null,
  copyStatus: null as HTMLElement | null,
};

export function initStatusBar(): void {
  els.nodes = document.getElementById('status-nodes');
  els.processingTime = document.getElementById('status-processing-time');
  els.size = document.getElementById('status-size');
  els.depth = document.getElementById('status-depth');
  els.error = document.getElementById('status-error');
  els.copyStatus = document.getElementById('status-copy');
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function setDocSize(bytes: number): void {
  if (els.size) {
    els.size.textContent = `Size: ${formatByteSize(bytes)}`;
  }
}

export function setMaxDepth(depth: number): void {
  if (els.depth) {
    els.depth.textContent = `Depth: ${depth}`;
  }
}

export function setNodeCount(count: number): void {
  if (els.nodes) els.nodes.textContent = `Nodes: ${count}`;
}

export function setProcessingTime(ms: number): void {
  if (els.processingTime) {
    const formattedTime = ms >= 1
      ? `${ms.toFixed(1)} ms`
      : `${(ms * 1000).toFixed(0)} μs`;
    els.processingTime.textContent = `Process: ${formattedTime}`;
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
