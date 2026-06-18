export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = CsvCell[];

const CSV_FORMULA_PREFIX_PATTERN = /^[\t\r\n ]*[=+\-@]/;
const FILENAME_FALLBACK = 'export.csv';

function neutralizeCsvFormula(value: string) {
  if (!CSV_FORMULA_PREFIX_PATTERN.test(value)) {
    return value;
  }

  return `'${value}`;
}

export function csvEscape(value: CsvCell) {
  const stringValue = typeof value === 'string'
    ? neutralizeCsvFormula(value)
    : String(value ?? '');

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

export function rowsToCsv(rows: CsvRow[]) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function sanitizeCsvFilename(filename: string) {
  const sanitized = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\r\n\t\0]/g, '')
    .replace(/[\\/]/g, '-')
    .replace(/["';,]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  const safeName = sanitized.length > 0 ? sanitized : FILENAME_FALLBACK;
  return safeName.toLowerCase().endsWith('.csv') ? safeName : `${safeName}.csv`;
}

export function csvDownloadResponse(rows: CsvRow[], filename: string) {
  const safeFilename = sanitizeCsvFilename(filename);

  return new Response(rowsToCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
