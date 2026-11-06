/**
 * Collect every evidence record for accurate tenant reports. Reject partial or
 * duplicated pages rather than presenting misleading compliance percentages.
 * The database caller must enforce RLS, stable ordering, and exact count parity.
 */
export async function collectEvidencePages<T extends { id: string }>(
  fetchPage: (offset: number, pageSize: number) => Promise<readonly T[]>,
  options: { pageSize?: number; maxItems?: number } = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 250;
  const maxItems = options.maxItems ?? 10_000;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error('Evidence report page size must be a positive integer.');
  }
  if (!Number.isSafeInteger(maxItems) || maxItems < 1) {
    throw new Error('Evidence report limit must be a positive integer.');
  }

  const evidence: T[] = [];
  const seen = new Set<string>();
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    if (!Array.isArray(page) || page.length > pageSize) {
      throw new Error('Evidence report provider returned an invalid page size.');
    }
    for (const item of page) {
      if (!item || typeof item.id !== 'string' || !item.id.trim()) {
        throw new Error('Evidence report contains a missing identifier.');
      }
      if (seen.has(item.id)) {
        throw new Error('Evidence report contains duplicate identifiers between pages.');
      }
      seen.add(item.id);
      evidence.push(item);
      if (evidence.length > maxItems) {
        throw new Error('Evidence report exceeds the safe report limit; no partial report was generated.');
      }
    }
    if (page.length < pageSize) return evidence;
  }
}
