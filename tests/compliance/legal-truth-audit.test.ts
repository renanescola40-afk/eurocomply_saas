import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { auditLegalTruth } from '../../scripts/compliance/legal-truth-audit.mjs';

function writeJson(root: string, path: string, document: unknown): void {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(document, null, 2)}\n`);
}

function writeText(root: string, path: string, value = 'evidence'): void {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, value);
}

function createFixture({
  includeAcceptedReview = false,
  reviewSha = 'sha-main',
}: {
  includeAcceptedReview?: boolean;
  reviewSha?: string;
} = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'risck-legal-truth-'));
  const implementationPath = 'src/feature.ts';
  const testPath = 'tests/feature.test.ts';
  const runtimePath = 'docs/security/evidence/runtime/feature.json';
  const acceptedPath = 'docs/compliance/evidence/accepted/legal-rules-qualified-review.json';

  writeText(root, implementationPath);
  writeText(root, testPath);
  writeJson(root, runtimePath, { status: 'PASS', sourceSha: 'sha-main' });

  writeJson(root, 'docs/compliance/eu-ai-act-product-coverage-registry.json', {
    version: '2026-07-30.1',
    lastVerifiedDate: '2026-07-30',
    totalWeight: 100,
    workstreams: [
      {
        id: 'LEGAL-RULES',
        weight: 100,
        implementationEvidence: [implementationPath],
        testEvidence: [testPath],
        runtimeEvidence: [runtimePath],
        humanReviewEvidence: [acceptedPath],
      },
    ],
  });

  writeJson(root, 'docs/compliance/evidence/qualified-review-execution-registry.json', {
    requirements: [{ id: 'legal-rules', weight: 100, acceptedPath }],
  });

  writeJson(root, 'docs/compliance/evidence/enterprise-evidence-closure-registry.json', {
    requirements: [
      {
        id: 'LEGAL-RULES-REVIEW',
        workstream: 'LEGAL-RULES',
        kind: 'human_review',
        path: acceptedPath,
      },
    ],
  });

  writeJson(root, 'docs/compliance/article-function-evidence-registry.v1.json', {
    regulation: 'Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744',
    entries: [
      {
        article: 'Article 5',
        status: 'HUMAN_REVIEW_REQUIRED',
        humanReviewEvidence: [acceptedPath],
      },
    ],
  });

  if (includeAcceptedReview) {
    writeJson(root, acceptedPath, {
      reviewerName: 'Qualified Reviewer',
      professionalRegistration: 'PT-12345',
      jurisdiction: 'Portugal',
      qualificationScope: 'EU AI Act and technology law',
      conflictAssessment: 'No conflict identified for the stated scope.',
      independenceDeclaration: 'Independent professional review.',
      reviewScope: 'Versioned legal rules registry.',
      productSha: reviewSha,
      evidencePackageDigest: `sha256:${'a'.repeat(64)}`,
      decision: 'ACCEPTED',
      validityStart: '2026-07-01T00:00:00.000Z',
      validityEnd: '2027-07-01T00:00:00.000Z',
      signedArtifactReference: 'private://signed/legal-rules.pdf',
      decisionDigest: `sha256:${'b'.repeat(64)}`,
      timestamp: '2026-07-30T10:00:00.000Z',
    });
  }

  return root;
}

describe('legal truth audit', () => {
  it('keeps missing accepted review evidence at HUMAN_REVIEW_REQUIRED with zero legal credit', () => {
    const report = auditLegalTruth({
      root: createFixture(),
      sourceSha: 'sha-main',
      now: new Date('2026-07-30T12:00:00.000Z'),
    });

    expect(report.totals.implementationPathCoverageWeight).toBe(100);
    expect(report.totals.testPathCoverageWeight).toBe(100);
    expect(report.totals.runtimeExactShaAcceptedWeight).toBe(100);
    expect(report.totals.humanReviewAcceptedWeight).toBe(0);
    expect(report.truth.humanLegalAcceptancePercent).toBe(0);
    expect(report.truth.counselAccepted).toBe(false);
    expect(report.humanReviews[0]).toMatchObject({
      exists: false,
      accepted: false,
      status: 'HUMAN_REVIEW_REQUIRED',
    });
  });

  it('accepts a complete, current, exact-SHA signed review record', () => {
    const report = auditLegalTruth({
      root: createFixture({ includeAcceptedReview: true }),
      sourceSha: 'sha-main',
      now: new Date('2026-07-30T12:00:00.000Z'),
    });

    expect(report.totals.humanReviewAcceptedWeight).toBe(100);
    expect(report.truth.humanLegalAcceptancePercent).toBe(100);
    expect(report.truth.counselAccepted).toBe(true);
    expect(report.humanReviews[0].status).toBe('COUNSEL_ACCEPTED');
  });

  it('rejects a review that is otherwise complete but bound to a different SHA', () => {
    const report = auditLegalTruth({
      root: createFixture({ includeAcceptedReview: true, reviewSha: 'different-sha' }),
      sourceSha: 'sha-main',
      now: new Date('2026-07-30T12:00:00.000Z'),
    });

    expect(report.totals.humanReviewAcceptedWeight).toBe(0);
    expect(report.humanReviews[0].failures).toContain('exact_sha_mismatch');
  });

  it('flags a row that grants legal acceptance while review evidence is required', () => {
    const root = createFixture();
    writeJson(root, 'docs/compliance/article-function-evidence-registry.v1.json', {
      regulation: 'Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744',
      entries: [
        {
          article: 'Article 5',
          status: 'COUNSEL_ACCEPTED',
          humanReviewEvidence: [
            'docs/compliance/evidence/accepted/legal-rules-qualified-review.json',
          ],
        },
      ],
    });

    const report = auditLegalTruth({
      root,
      sourceSha: 'sha-main',
      now: new Date('2026-07-30T12:00:00.000Z'),
    });

    expect(report.inconsistencies.articleRowsGrantingCreditWithoutRequiredHumanReview).toHaveLength(1);
  });
});
