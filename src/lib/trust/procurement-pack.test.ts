import { describe, expect, it } from 'vitest';

import { buildPublicProcurementPack, procurementControls, procurementDocuments, procurementProviders } from './procurement-pack';

describe('public procurement pack', () => {
  it('publishes a stable evidence-bound schema', () => {
    const pack = buildPublicProcurementPack('https://www.risckcomply.com');
    expect(pack.schemaVersion).toBe(1);
    expect(pack.product).toBe('RISCK COMPLY');
    expect(pack.controls).toHaveLength(procurementControls.length);
    expect(pack.providers).toHaveLength(procurementProviders.length);
    expect(pack.documents).toHaveLength(procurementDocuments.length);
  });

  it('uses absolute same-origin document URLs', () => {
    const pack = buildPublicProcurementPack('https://www.risckcomply.com');
    for (const document of pack.documents) {
      expect(document.url.startsWith('https://www.risckcomply.com/')).toBe(true);
    }
  });

  it('keeps unsupported certifications explicitly unclaimed', () => {
    const certifications = procurementControls.find((control) => control.id === 'certifications');
    expect(certifications?.status).toBe('not-claimed');
    expect(certifications?.summary).toContain('No SOC 2 or ISO 27001 certification is claimed');
    expect(certifications?.summary).toContain('dated and attributable certification evidence');

    const assessment = procurementControls.find((control) => control.id === 'security-assessment');
    expect(assessment?.status).toBe('evidence-required');
    expect(assessment?.summary).toContain('2026-09-12');
    expect(assessment?.summary).toContain('clean independent retest/terminal assurance remains open');
  });

  it('has unique control and document identifiers', () => {
    expect(new Set(procurementControls.map((control) => control.id)).size).toBe(procurementControls.length);
    expect(new Set(procurementDocuments.map((document) => document.path)).size).toBe(procurementDocuments.length);
  });
});
