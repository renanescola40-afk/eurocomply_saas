import { describe, expect, it } from 'vitest';
import { ANNEX_IV_SECTIONS, evaluateAnnexIvPackage } from './annex-iv-technical-documentation';

describe('Annex IV technical documentation', () => {
  it('fails closed when sections are missing', () => {
    expect(evaluateAnnexIvPackage([]).complete).toBe(false);
  });

  it('passes only with approved, reviewed and evidenced sections', () => {
    const records = ANNEX_IV_SECTIONS.map((section) => ({ section, status: 'approved' as const, evidenceDigest: 'a'.repeat(64), reviewerId: 'reviewer' }));
    expect(evaluateAnnexIvPackage(records).complete).toBe(true);
  });
});
