/**
 * Natural sorting comparator for strings and mixed alphanumeric/numeric identifiers.
 * Guarantees standard natural ordering:
 * 1, 2, 3 ... 8, 9, 10, 11, 12 ... 98, 99, 100, 101 etc.
 * Handles pure numbers, strings starting with numbers, and embedded numbers.
 */
export function naturalCompare(a?: string | null, b?: string | null): number {
  const strA = (a ?? '').trim();
  const strB = (b ?? '').trim();

  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  // If both strings are valid pure numbers, compare them numerically
  const numA = Number(strA);
  const numB = Number(strB);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numA - numB;
  }

  // Use Hungarian locale with numeric: true (natural collation)
  // This automatically handles numeric sequences inside strings:
  // e.g. "Termék 2" before "Termék 10", "1. elem" before "10. elem", etc.
  return strA.localeCompare(strB, 'hu', { numeric: true, sensitivity: 'base' });
}
