import { describe, expect, it } from 'vitest';

import { evaluateFinalLegalPublicationGate } from '../../scripts/compliance/check-final-legal-publication-gate.mjs';
import { generateLegalCounselHandoffBundle } from '../../scripts/compliance/generate-legal-counsel-handoff-bundle.mjs';

const expectedSha = 'd'.repeat(40);
const now = new Date('2026-07-30T18:00:00.000Z');

describe('final legal publication gate', () => {
  it('passes repository preparation while truthfully blocking final publication', () => {
    const report = evaluateFinalLegalPublicationGate({
      root: process.cwd(),
      expectedSha,
      now,
    });

    expect(report.repositoryPreparation.ready).toBe(true);
    expect(report.repositoryPreparation.reviewPackageStatus).toBe('READY_FOR_QUALIFIED_REVIEW');
    expect(report.repositoryPreparation.contractPackStatus).toBe('READY_FOR_FOUNDER_AND_COUNSEL_HANDOFF');
    expect(report.publishFinalLegalDocuments).toBe(false);
    expect(report.publicSurfaceMode).toBe('INFORMATIONAL_REVIEW_DRAFT');
    expect(report.publicationStatus).toBe('FOUNDER_FACT_REQUIRED');
    expect(report.humanAndExternalEvidence.founderFactsAccepted).toBe(false);
    expect(report.humanAndExternalEvidence.qualifiedReviewAcceptedCount).toBe(0);
    expect(report.humanAndExternalEvidence.masterDecisionAccepted).toBe(false);
    expect(report.blockers).toContain('founder_facts:missing');
    expect(report.blockers).toContain('qualified_reviews:0/8');
    expect(report.blockers).toContain('master_decision:missing');
  });

  it('generates a deterministic counsel bundle without embedding signed decisions', () => {
    const bundle = generateLegalCounselHandoffBundle({
      root: process.cwd(),
      sourceSha: expectedSha,
      generatedAt: now,
    });

    expect(bundle.preparationStatus).toBe('READY_FOR_COUNSEL_HANDOFF');
    expect(bundle.legalAcceptanceStatus).toBe('HUMAN_REVIEW_REQUIRED');
    expect(bundle.missingPreparationPaths).toEqual([]);
    expect(bundle.fileCount).toBeGreaterThan(30);
    expect(bundle.packageDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(bundle.externalDecisionStatus).toHaveLength(10);
    expect(bundle.externalDecisionStatus.every((item) => item.includedInBundle === false)).toBe(true);
    expect(bundle.files.some((file) => file.path.includes('/evidence/accepted/'))).toBe(false);
  });
});
