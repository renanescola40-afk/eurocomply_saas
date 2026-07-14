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

const DATE_LOCALES: Record<InventoryCsvLocale, string> = {
  en: 'en-GB',
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
};

const COPY: Record<InventoryCsvLocale, {
  headers: string[];
  risks: Record<string, string>;
  statuses: Record<string, string>;
}> = {
  en: {
    headers: ['Name', 'Vendor', 'Department', 'Risk level', 'Status', 'Assessment date'],
    risks: { unacceptable: 'Unacceptable', high: 'High risk', limited: 'Limited risk', minimal: 'Minimal risk' },
    statuses: { review: 'In review', compliant: 'Compliant', non_compliant: 'Non-compliant', mitigated: 'Mitigated' },
  },
  pt: {
    headers: ['Nome', 'Fornecedor', 'Departamento', 'Nível de risco', 'Estado', 'Data da avaliação'],
    risks: { unacceptable: 'Inaceitável', high: 'Alto risco', limited: 'Risco limitado', minimal: 'Risco mínimo' },
    statuses: { review: 'Em revisão', compliant: 'Conforme', non_compliant: 'Não conforme', mitigated: 'Mitigado' },
  },
  es: {
    headers: ['Nombre', 'Proveedor', 'Departamento', 'Nivel de riesgo', 'Estado', 'Fecha de evaluación'],
    risks: { unacceptable: 'Inaceptable', high: 'Alto riesgo', limited: 'Riesgo limitado', minimal: 'Riesgo mínimo' },
    statuses: { review: 'En revisión', compliant: 'Conforme', non_compliant: 'No conforme', mitigated: 'Mitigado' },
  },
  fr: {
    headers: ['Nom', 'Fournisseur', 'Service', 'Niveau de risque', 'Statut', 'Date d’évaluation'],
    risks: { unacceptable: 'Inacceptable', high: 'Risque élevé', limited: 'Risque limité', minimal: 'Risque minimal' },
    statuses: { review: 'En révision', compliant: 'Conforme', non_compliant: 'Non conforme', mitigated: 'Atténué' },
  },
  it: {
    headers: ['Nome', 'Fornitore', 'Reparto', 'Livello di rischio', 'Stato', 'Data di valutazione'],
    risks: { unacceptable: 'Inaccettabile', high: 'Alto rischio', limited: 'Rischio limitato', minimal: 'Rischio minimo' },
    statuses: { review: 'In revisione', compliant: 'Conforme', non_compliant: 'Non conforme', mitigated: 'Mitigato' },
  },
  de: {
    headers: ['Name', 'Anbieter', 'Abteilung', 'Risikostufe', 'Status', 'Bewertungsdatum'],
    risks: { unacceptable: 'Unzulässig', high: 'Hohes Risiko', limited: 'Begrenztes Risiko', minimal: 'Minimales Risiko' },
    statuses: { review: 'In Prüfung', compliant: 'Konform', non_compliant: 'Nicht konform', mitigated: 'Gemindert' },
  },
};

function formatDate(value: string, locale: InventoryCsvLocale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function buildLocalizedInventoryCsv(rows: InventoryCsvRow[], locale: InventoryCsvLocale): string {
  const copy = COPY[locale] ?? COPY.en;
  const values = rows.map((row) => [
    row.name,
    row.vendor,
    row.department,
    copy.risks[row.riskLevel] ?? row.riskLevel,
    copy.statuses[row.status] ?? row.status,
    formatDate(row.createdAt, locale),
  ]);

  return rowsToCsv([copy.headers, ...values]);
}
