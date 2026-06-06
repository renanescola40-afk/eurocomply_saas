import { describe, expect, it } from 'vitest';
import { csvEscape, rowsToCsv } from '@/lib/exports/csv';

describe('CSV export helpers', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(csvEscape('Acme, Inc.')).toBe('"Acme, Inc."');
    expect(csvEscape('He said "yes"')).toBe('"He said ""yes"""');
    expect(csvEscape('line one\nline two')).toBe('"line one\nline two"');
  });

  it('serializes rows safely', () => {
    const csv = rowsToCsv([
      ['Name', 'Status'],
      ['Vendor, A', 'approved'],
      ['Risk "Critical"', null],
    ]);

    expect(csv).toBe('Name,Status\n"Vendor, A",approved\n"Risk ""Critical""",');
  });
});
