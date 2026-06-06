export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = CsvCell[];

export function csvEscape(value: CsvCell) {
  const stringValue = String(value ?? '');

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

export function rowsToCsv(rows: CsvRow[]) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function csvDownloadResponse(rows: CsvRow[], filename: string) {
  return new Response(rowsToCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
