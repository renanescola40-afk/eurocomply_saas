import { rowsToCsv } from '@/lib/exports/csv';

export type InventoryCsvLocale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

export interface InventoryCsvRow {
  name: string;
  vendor: string;
  department: string;
  riskLevel: string;
  status: string;
  createdAt: string;
}

export interface InventoryDisplayCsvRow {
  name: string;
  vendor: string;
  department: string;
  riskLabel: string;
  statusLabel: string;
  assessmentDate: string;
}

const ENGLISH_COPY: {
  headers: string[];
  risks: Record<string, string>;
  statuses: Record<string, string>;
} = {
    headers: ['Name', 'Vendor', 'Department', 'Risk level', 'Status', 'Assessment date'],
    risks: { unacceptable: 'Unacceptable', high: 'High risk', limited: 'Limited risk', minimal: 'Minimal risk' },
    statuses: { review: 'In review', compliant: 'Compliant', non_compliant: 'Non-compliant', mitigated: 'Mitigated' },
  };


function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function buildLocalizedInventoryCsv(rows: InventoryCsvRow[], _locale: InventoryCsvLocale): string {
  const copy = ENGLISH_COPY;
  const values = rows.map((row) => [
    row.name,
    row.vendor,
    row.department,
    copy.risks[row.riskLevel] ?? row.riskLevel,
    copy.statuses[row.status] ?? row.status,
    formatDate(row.createdAt),
  ]);

  return rowsToCsv([copy.headers, ...values]);
}

export function buildLocalizedInventoryDisplayCsv(
  rows: InventoryDisplayCsvRow[],
  _locale: InventoryCsvLocale,
): string {
  const copy = ENGLISH_COPY;
  return rowsToCsv([
    copy.headers,
    ...rows.map((row) => [
      row.name,
      row.vendor,
      row.department,
      row.riskLabel,
      row.statusLabel,
      row.assessmentDate,
    ]),
  ]);
}
