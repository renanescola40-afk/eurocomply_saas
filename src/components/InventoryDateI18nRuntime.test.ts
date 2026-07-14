import { describe, expect, it } from 'vitest';

import { localizeInventoryDate } from './InventoryDateI18nRuntime';

describe('localizeInventoryDate', () => {
  it.each([
    ['en', '31/12/2026'],
    ['es', '31/12/2026'],
    ['fr', '31/12/2026'],
    ['it', '31/12/2026'],
    ['de', '31.12.2026'],
  ] as const)('formats visible inventory dates for %s', (locale, expected) => {
    expect(localizeInventoryDate('31/12/2026', locale)).toBe(expected);
  });

  it('preserves Portuguese formatting', () => {
    expect(localizeInventoryDate('31/12/2026', 'pt')).toBe('31/12/2026');
  });

  it('preserves invalid dates and unrelated text', () => {
    expect(localizeInventoryDate('31/02/2026', 'de')).toBe('31/02/2026');
    expect(localizeInventoryDate('Assessment pending', 'en')).toBe('Assessment pending');
  });
});
