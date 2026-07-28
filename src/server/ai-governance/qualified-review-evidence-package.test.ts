import { describe, expect, it } from 'vitest';
import { buildQualifiedReviewEvidencePackage, verifyQualifiedReviewEvidencePackage } from './qualified-review-evidence-package';

const baseItem = {
  weight: 6,
  assignmentId: '00000000-0000-4000-8000-000000000001',
  reviewerId: '00000000-0000-4000-8000-000000000002',
  submissionId: '00000000-0000-4000-8000-000000000003',
  decisionId: '00000000-0000-4000-8000-000000000004',
  targetSha: 'a'.repeat(40),
  integritySha256: 'b'.repeat(64),
  acceptedAt: '2026-07-28T10:00:00.000Z',
  validUntil: '2027-07-28T10:00:00.000Z',
};

describe('qualified review evidence package', () => {
  it('produces a deterministic manifest', () => {
    const pkg = buildQualifiedReviewEvidencePackage({
      campaignId: '00000000-0000-4000-8000-000000000010',
      organizationId: '00000000-0000-4000-8000-000000000011',
      targetSha: 'a'.repeat(40),
      generatedAt: '2026-07-28T10:00:00.000Z',
      acceptedPoints: 51,
      blockers: [],
      items: Array.from({ length: 8 }, (_, index) => ({ ...baseItem, workstreamId: `ws-${index}`, weight: index === 0 ? 9 : 6 })),
    });
    expect(pkg.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyQualifiedReviewEvidencePackage(pkg)).toEqual({ validDigest: true, validSha: true, validItems: true, complete: true, humanReviewRequired: true });
  });

  it('detects tampering', () => {
    const pkg = buildQualifiedReviewEvidencePackage({
      campaignId: '00000000-0000-4000-8000-000000000010',
      organizationId: '00000000-0000-4000-8000-000000000011',
      targetSha: 'a'.repeat(40),
      generatedAt: '2026-07-28T10:00:00.000Z',
      acceptedPoints: 0,
      blockers: ['missing_reviews'],
      items: [],
    });
    expect(verifyQualifiedReviewEvidencePackage({ ...pkg, acceptedPoints: 51 }).validDigest).toBe(false);
  });
});
