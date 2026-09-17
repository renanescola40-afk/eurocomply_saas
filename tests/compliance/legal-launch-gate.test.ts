import { describe, expect, it } from 'vitest';

import {
  evaluateLegalLaunchDecision,
  validateLegalLaunchReadinessDocument,
} from '../../scripts/compliance/check-legal-launch-gate.mjs';

const expectedSha = 'a'.repeat(40);
const mandatoryControlIds = [
  'ai-act-applicability',
  'controller-processor-roles',
  'privacy-notice-lawful-bases',
  'article-28-dpa',
  'subprocessors-international-transfers',
  'retention-dsr-breach',
  'dpo-dpia-applicability',
  'cookies-eprivacy-analytics-marketing',
  'commercial-terms-publication',
];

function readinessDocument({ externalReviewRequired = false } = {}) {
  return {
    schema: 'risck-comply.legal-launch-readiness.v1',
    productSha: expectedSha,
    status: 'LEGAL_LAUNCH_READY',
    acceptedAt: '2026-09-17T00:00:00Z',
    publicLegalSurfaceEffective: true,
    evidenceRefs: ['docs/legal-assurance/LEGAL_LAUNCH_SCORECARD_V2.md'],
    mandatoryControls: mandatoryControlIds.map((id) => ({
      id,
      status: 'PASS',
      evidenceRefs: [`evidence/${id}.json`],
    })),
    qualifiedExternalReview: {
      required: externalReviewRequired,
      rationale: externalReviewRequired
        ? 'A current binding requirement explicitly requires qualified external review.'
        : 'No law, regulator, conformity route, contract or actual buyer requirement currently makes qualified external review mandatory for this release scope.',
      changeTrigger: 'Re-evaluate whenever the applicable scope or an actual binding requirement changes.',
    },
  };
}

describe('legal launch readiness artifact', () => {
  it('accepts all mandatory controls when exact-SHA evidence and effective publication are present', () => {
    const result = validateLegalLaunchReadinessDocument(readinessDocument(), expectedSha);

    expect(result.accepted).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.externalReviewRequired).toBe(false);
  });

  it('requires rationale and change trigger for NOT_APPLICABLE controls', () => {
    const document = readinessDocument();
    document.mandatoryControls[0] = {
      id: 'ai-act-applicability',
      status: 'NOT_APPLICABLE',
      evidenceRefs: ['docs/legal-assurance/RISCK_COMPLY_REGULATORY_FEATURE_INVENTORY_V1_2026-09-14.md'],
    };

    const result = validateLegalLaunchReadinessDocument(document, expectedSha);

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('mandatory_control_ai-act-applicability_na_rationale_missing');
    expect(result.failures).toContain('mandatory_control_ai-act-applicability_na_change_trigger_missing');
  });

  it('fails if final public legal surfaces are still review drafts', () => {
    const document = readinessDocument();
    document.publicLegalSurfaceEffective = false;

    const result = validateLegalLaunchReadinessDocument(document, expectedSha);

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('public_legal_surface_not_effective');
  });
});

describe('legal launch gate', () => {
  it('allows launch without inventing mandatory counsel only after mandatory controls close', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      launchReadinessAccepted: true,
      repositoryPreparationFailures: [],
      qualifiedExternalReviewRequired: false,
      qualifiedReviewAcceptedCount: 0,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: false,
    });

    expect(report.accepted).toBe(true);
    expect(report.publicationStatus).toBe('LEGAL_LAUNCH_ACCEPTED');
    expect(report.publishFinalLegalDocuments).toBe(true);
    expect(report.mandatoryLaunch.status).toBe('PASS');
    expect(report.optionalMaxAssurance.status).toBe('OPTIONAL_ASSURANCE_OPEN');
    expect(report.optionalMaxAssurance.requiredForCurrentLaunch).toBe(false);
    expect(report.optionalMaxAssurance.blocksLegalLaunch).toBe(false);
  });

  it('fails closed when attributable founder facts are not accepted', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: false,
      founderFactsUnresolvedFields: ['legalEntity.registeredAddress'],
      launchReadinessAccepted: true,
      repositoryPreparationFailures: [],
      qualifiedReviewAcceptedCount: 8,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: true,
    });

    expect(report.accepted).toBe(false);
    expect(report.publicationStatus).toBe('FOUNDER_FACT_REQUIRED');
    expect(report.mandatoryLaunch.blockers).toContain('founder_facts_not_accepted');
    expect(report.optionalMaxAssurance.status).toBe('COUNSEL_ACCEPTED');
  });

  it('fails closed when mandatory legal controls are not accepted', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      launchReadinessAccepted: false,
      launchReadinessFailures: ['public_legal_surface_not_effective'],
      repositoryPreparationFailures: [],
      qualifiedReviewAcceptedCount: 0,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: false,
    });

    expect(report.accepted).toBe(false);
    expect(report.mandatoryLaunch.blockers).toContain('mandatory_legal_launch_controls_not_accepted');
    expect(report.mandatoryLaunch.blockers).toContain('launch_readiness:public_legal_surface_not_effective');
  });

  it('fails closed when repository-controlled legal preparation is invalid', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      launchReadinessAccepted: true,
      repositoryPreparationFailures: ['contract_pack:manifest_invalid'],
      qualifiedReviewAcceptedCount: 0,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: false,
    });

    expect(report.accepted).toBe(false);
    expect(report.publicationStatus).toBe('LEGAL_LAUNCH_BLOCKED');
    expect(report.mandatoryLaunch.blockers).toContain('repository_preparation_failed');
  });

  it('makes qualified review mandatory when the current-scope applicability decision triggers it', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      launchReadinessAccepted: true,
      repositoryPreparationFailures: [],
      qualifiedExternalReviewRequired: true,
      qualifiedReviewAcceptedCount: 0,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: false,
    });

    expect(report.accepted).toBe(false);
    expect(report.optionalMaxAssurance.requiredForCurrentLaunch).toBe(true);
    expect(report.optionalMaxAssurance.blocksLegalLaunch).toBe(true);
    expect(report.mandatoryLaunch.blockers).toContain('triggered_qualified_external_review_not_accepted');
  });

  it('closes a triggered qualified-review requirement only with all reviews plus master decision', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      launchReadinessAccepted: true,
      repositoryPreparationFailures: [],
      qualifiedExternalReviewRequired: true,
      qualifiedReviewAcceptedCount: 8,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: true,
    });

    expect(report.accepted).toBe(true);
    expect(report.optionalMaxAssurance.status).toBe('COUNSEL_ACCEPTED');
    expect(report.optionalMaxAssurance.blocksLegalLaunch).toBe(false);
  });
});
