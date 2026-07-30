import { describe, expect, it } from 'vitest';

import {
  EXPECTED_PACKAGES,
  validateQualifiedReviewPackages,
} from '../../scripts/compliance/validate-qualified-review-packages.mjs';

describe('qualified legal review packages', () => {
  it('prepares all eight registered packages without granting legal acceptance', () => {
    const report = validateQualifiedReviewPackages({ root: process.cwd() });

    expect(EXPECTED_PACKAGES).toHaveLength(8);
    expect(report.failures).toEqual([]);
    expect(report.packageCount).toBe(8);
    expect(report.totalWeight).toBe(51);
    expect(report.preparationReadyCount).toBe(8);
    expect(report.legalAcceptedCount).toBe(0);
    expect(report.status).toBe('READY_FOR_QUALIFIED_REVIEW');
    expect(report.packages.every((item) => item.preparationReady)).toBe(true);
    expect(report.packages.every((item) => item.legalAcceptance === 'HUMAN_REVIEW_REQUIRED')).toBe(true);
  });

  it('keeps every manifest on the non-crediting status boundary', async () => {
    for (const [id] of EXPECTED_PACKAGES) {
      const manifest = await import(
        `../../docs/legal-review-preparation/review-packages/${id}/manifest.json`,
        { with: { type: 'json' } }
      );
      expect(manifest.default.status).toBe('HUMAN_REVIEW_REQUIRED');
      expect(manifest.default.preReviewFindings.length).toBeGreaterThan(0);
      expect(manifest.default.acceptanceCriteria.length).toBeGreaterThan(0);
    }
  });
});
