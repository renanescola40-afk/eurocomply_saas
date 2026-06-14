const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = value instanceof Date ? value.toISOString() : String(value);
  const safeText = FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix)) ? `'${text}` : text;
  const escaped = safeText.replaceAll('"', '""');

  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function toCsvRow(values: unknown[]): string {
  return values.map((value) => escapeCsvCell(value)).join(',');
}
