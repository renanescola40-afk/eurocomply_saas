import { describe, expect, it } from 'vitest';
import { csvDownloadResponse, csvEscape, rowsToCsv, sanitizeCsvFilename } from '@/lib/exports/csv';

describe('CSV export helpers', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(csvEscape('Acme, Inc.')).toBe('"Acme, Inc."');
    expect(csvEscape('He said "yes"')).toBe('"He said ""yes"""');
    expect(csvEscape('line one\nline two')).toBe('"line one\nline two"');
  });

  it('neutralizes spreadsheet formulas in text cells', () => {
    expect(csvEscape('=IMPORTXML("https://attacker.example")')).toBe('\'=IMPORTXML(""https://attacker.example"")');
    expect(csvEscape('+SUM(1,2)')).toBe('"\'+SUM(1,2)"');
    expect(csvEscape('-2+3')).toBe("'-2+3");
    expect(csvEscape('@cmd')).toBe("'@cmd");
    expect(csvEscape('\t=HYPERLINK("https://attacker.example")')).toBe('"\'\t=HYPERLINK(""https://attacker.example"")"');
  });

  it('does not rewrite numeric negative values as formulas', () => {
    expect(csvEscape(-42)).toBe('-42');
  });

  it('serializes rows safely', () => {
    const csv = rowsToCsv([
      ['Name', 'Status'],
      ['Vendor, A', 'approved'],
      ['Risk "Critical"', null],
    ]);

    expect(csv).toBe('Name,Status\n"Vendor, A",approved\n"Risk ""Critical""",');
  });

  it('sanitizes download filenames for Content-Disposition', () => {
    expect(sanitizeCsvFilename('../evil\r\nSet-Cookie: x=1.csv')).toBe('..-evilSet-Cookie x=1.csv');
    expect(sanitizeCsvFilename('relatorio executivo')).toBe('relatorio executivo.csv');
    expect(sanitizeCsvFilename('\0\r\n')).toBe('export.csv');
  });

  it('returns CSV downloads with cache and sniffing protections', async () => {
    const response = csvDownloadResponse([['Name'], ['=cmd']], '../report\r\n.csv');

    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="..-report.csv"');
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await response.text()).toBe("Name\n'=cmd");
  });
});
