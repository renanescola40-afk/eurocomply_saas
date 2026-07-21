import { describe, expect, it } from 'vitest';
import {
  ANNEX_IV_SECTIONS,
  assessAnnexIv,
  decideAnnexIvPackage,
  type AnnexIvInput,
  type AnnexIvPackageInput,
} from './annex-iv';

const digest = 'a'.repeat(64);

function approvedSections(): AnnexIvInput {
  return Object.fromEntries(
    ANNEX_IV_SECTIONS.map((section) => [
      section,
      {
        summary: `Approved technical documentation for ${section}`,
        evidenceReferences: [`evidence:${section}:v1`],
        ownerId: 'owner-1',
        reviewerId: 'reviewer-1',
        reviewedAt: '2026-07-21T12:00:00.000Z',
        approvedAt: '2026-07-21T13:00:00.000Z',
        contentDigest: digest,
        sourceVersion: 'system-v1.0.0',
        status: 'approved',
        lastMaterialChangeAt: '2026-07-20T12:00:00.000Z',
      },
    ]),
  ) as AnnexIvInput;
}

const completePackage: AnnexIvPackageInput = {
  applicability: 'required',
  highRiskSystem: true,
  providerRoleConfirmed: true,
  systemVersionRecorded: true,
  documentationVersion: 1,
  sections: approvedSections(),
  traceabilityComplete: true,
  dataLineageComplete: true,
  validationAndTestingComplete: true,
  instructionsForUseAligned: true,
  riskManagementLinked: true,
  postMarketPlanLinked: true,
  conformityAssessmentLinked: true,
  changeLogComplete: true,
  substantialModificationReviewComplete: true,
  openHighFindings: 0,
  openCriticalFindings: 0,
  accountableOwnerAssigned: true,
  independentReviewerAssigned: true,
  approverAssigned: true,
  legalReviewComplete: false,
  approvedAt: '2026-07-21T14:00:00.000Z',
};

describe('Annex IV compatibility completeness', () => {
  it('fails closed when sections are absent', () => {
    const result = assessAnnexIv({});
    expect(result.complete).toBe(false);
    expect(result.completionPercent).toBe(0);
    expect(result.missingSections).toHaveLength(ANNEX_IV_SECTIONS.length);
  });

  it('requires content, evidence, owner and review timestamp for each section', () => {
    const result = assessAnnexIv({
      general_description: {
        summary: 'System description',
        evidenceReferences: ['document:system-card-v1'],
        ownerId: 'owner-1',
      },
    });
    const section = result.sections.find((item) => item.section === 'general_description');
    expect(section?.complete).toBe(false);
    expect(section?.missing).toEqual(['reviewedAt']);
  });

  it('keeps the legacy package complete when all twelve sections have the original fields', () => {
    const input = Object.fromEntries(
      ANNEX_IV_SECTIONS.map((section) => [
        section,
        {
          summary: `Reviewed ${section}`,
          evidenceReferences: [`evidence:${section}`],
          ownerId: 'owner-1',
          reviewedAt: '2026-07-20T00:00:00.000Z',
        },
      ]),
    ) as AnnexIvInput;
    const result = assessAnnexIv(input);
    expect(result.complete).toBe(true);
    expect(result.completionPercent).toBe(100);
    expect(result.missingSections).toEqual([]);
  });
});

describe('Annex IV governed package', () => {
  it('approves a complete independently reviewed package', () => {
    const result = decideAnnexIvPackage(completePackage);
    expect(result.stage).toBe('approved');
    expect(result.publicationReady).toBe(true);
    expect(result.conformityAssessmentReady).toBe(true);
    expect(result.governedSections).toHaveLength(ANNEX_IV_SECTIONS.length);
    expect(result.governedSections.every((section) => section.approved)).toBe(true);
  });

  it('fails closed when applicability is uncertain', () => {
    const result = decideAnnexIvPackage({
      ...completePackage,
      applicability: 'uncertain',
      legalReviewComplete: false,
      approvedAt: null,
    });
    expect(result.stage).toBe('applicability_review');
    expect(result.legalReviewRequired).toBe(true);
    expect(result.publicationReady).toBe(false);
    expect(result.missingControlIds).toContain('AIV-20');
  });

  it('blocks release while severe findings remain open', () => {
    const result = decideAnnexIvPackage({
      ...completePackage,
      openCriticalFindings: 1,
      legalReviewComplete: true,
    });
    expect(result.stage).toBe('blocked');
    expect(result.publicationReady).toBe(false);
    expect(result.blockingControlIds).toContain('AIV-15');
  });

  it('requires renewed review after a material change', () => {
    const sections = approvedSections();
    sections.general_description = {
      ...sections.general_description,
      lastMaterialChangeAt: '2026-07-22T12:00:00.000Z',
    };
    const result = decideAnnexIvPackage({ ...completePackage, sections });
    const general = result.governedSections.find(
      (section) => section.section === 'general_description',
    );
    expect(result.stage).toBe('authoring');
    expect(general?.missing).toContain('changeReview');
    expect(result.missingControlIds).toContain('AIV-05');
  });

  it('requires reviewer separation and SHA-256 evidence integrity', () => {
    const sections = approvedSections();
    sections.cybersecurity = {
      ...sections.cybersecurity,
      reviewerId: 'owner-1',
      contentDigest: 'invalid',
    };
    const result = decideAnnexIvPackage({ ...completePackage, sections });
    const cybersecurity = result.governedSections.find(
      (section) => section.section === 'cybersecurity',
    );
    expect(cybersecurity?.missing).toEqual(
      expect.arrayContaining(['reviewerSeparation', 'contentDigest']),
    );
    expect(result.publicationReady).toBe(false);
  });

  it('records a reviewed non-applicability outcome without claiming conformity', () => {
    const result = decideAnnexIvPackage({
      ...completePackage,
      applicability: 'not_required',
      highRiskSystem: false,
      providerRoleConfirmed: false,
      legalReviewComplete: true,
      sections: {},
      approvedAt: null,
    });
    expect(result.stage).toBe('not_applicable');
    expect(result.publicationReady).toBe(false);
  });

  it('rejects invalid version and finding counters', () => {
    expect(() =>
      decideAnnexIvPackage({ ...completePackage, documentationVersion: 0 }),
    ).toThrow('documentationVersion must be a positive integer');
    expect(() =>
      decideAnnexIvPackage({ ...completePackage, openHighFindings: -1 }),
    ).toThrow('open finding counts cannot be negative');
  });

  it('preserves the non-certification boundary', () => {
    expect(decideAnnexIvPackage(completePackage).evidenceBoundary).toContain(
      'does not validate technical truth',
    );
  });
});
