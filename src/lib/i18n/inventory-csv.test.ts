import { describe, expect, it } from 'vitest';

import {
  buildLocalizedInventoryCsv,
  buildLocalizedInventoryDisplayCsv,
} from './inventory-csv';

const row = {
  name: 'Recruiting AI',
  vendor: 'Vendor "One"',
  department: 'HR',
  riskLevel: 'high',
  status: 'review',
  createdAt: '2026-12-31T12:00:00.000Z',
};

describe('buildLocalizedInventoryCsv', () => {
  it('localizes headers, risk, status and date for English', () => {
    const csv = buildLocalizedInventoryCsv([row], 'en');
    expect(csv).toContain('Name,Vendor,Department,Risk level,Status,Assessment date');
    expect(csv).toContain('High risk,In review,31/12/2026');
  });

  it('localizes German values and date punctuation', () => {
    const csv = buildLocalizedInventoryCsv([row], 'de');
    expect(csv).toContain('Risikostufe');
    expect(csv).toContain('Hohes Risiko,In Prüfung,31.12.2026');
  });

  it('preserves Portuguese terminology', () => {
    const csv = buildLocalizedInventoryCsv([row], 'pt');
    expect(csv).toContain('Nível de risco,Estado,Data da avaliação');
    expect(csv).toContain('Alto risco,Em revisão,31/12/2026');
  });

  it('escapes quotes and preserves unknown values', () => {
    const csv = buildLocalizedInventoryCsv([{ ...row, riskLevel: 'custom', status: 'pending' }], 'en');
    expect(csv).toContain('"Vendor ""One"""');
    expect(csv).toContain('custom,pending');
  });

  it('neutralizes spreadsheet formulas in tenant-controlled fields', () => {
    const csv = buildLocalizedInventoryCsv([{ ...row, name: '=IMPORTXML("https://example.test")' }], 'en');
    expect(csv).toContain("'=IMPORTXML");
    expect(csv).not.toContain('\n=IMPORTXML');
  });

  it('exports already-localized visible rows with localized headers', () => {
    const csv = buildLocalizedInventoryDisplayCsv([{
      name: 'Recruiting AI',
      vendor: 'Vendor One',
      department: 'Personal',
      riskLabel: 'Hohes Risiko',
      statusLabel: 'In Prüfung',
      assessmentDate: '31.12.2026',
    }], 'de');

    expect(csv).toContain('Name,Anbieter,Abteilung,Risikostufe,Status,Bewertungsdatum');
    expect(csv).toContain('Hohes Risiko,In Prüfung,31.12.2026');
  });
});
