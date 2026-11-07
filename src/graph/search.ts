import type { FlatRow } from './projection';

/**
 * Search visible graph rows and return their flat row indices.
 */
export function searchNodes(flatRows: FlatRow[], query: string): number[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return flatRows.flatMap((flatRow, index) => {
    const text = `${flatRow.row.key ?? ''} ${flatRow.row.value}`.toLowerCase();
    return text.includes(normalizedQuery) ? [index] : [];
  });
}
