import { describe, expect, it } from 'vitest';

import { evaluateLegalLaunchDecision } from '../../scripts/compliance/check-legal-launch-gate.mjs';

const expectedSha = 'a'.repeat(40);

describe('legal launch gate', () => {
  it('allows exact-SHA launch closure without inventing mandatory counsel', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      repositoryPreparationFailures: [],
      qualifiedReviewAcceptedCount: 0,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: false,
    });

    expect(report.accepted).toBe(true);
    expect(report.publicationStatus).toBe('LEGAL_LAUNCH_ACCEPTED');
    expect(report.publishFinalLegalDocuments).toBe(true);
    expect(report.mandatoryLaunch.status).toBe('PASS');
    expect(report.optionalMaxAssurance.status).toBe('OPTIONAL_ASSURANCE_OPEN');
    expect(report.optionalMaxAssurance.blocksLegalLaunch).toBe(false);
  });

  it('fails closed when attributable founder facts are not accepted', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: false,
      founderFactsUnresolvedFields: ['legalEntity.registeredAddress'],
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

  it('fails closed when repository-controlled legal preparation is invalid', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      repositoryPreparationFailures: ['contract_pack:manifest_invalid'],
      qualifiedReviewAcceptedCount: 0,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: false,
    });

    expect(report.accepted).toBe(false);
    expect(report.publicationStatus).toBe('LEGAL_LAUNCH_BLOCKED');
    expect(report.mandatoryLaunch.blockers).toContain('repository_preparation_failed');
  });

  it('reports optional maximum assurance independently when all external legal evidence exists', () => {
    const report = evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: true,
      repositoryPreparationFailures: [],
      qualifiedReviewAcceptedCount: 8,
      qualifiedReviewRequiredCount: 8,
      masterDecisionAccepted: true,
    });

    expect(report.accepted).toBe(true);
    expect(report.optionalMaxAssurance.status).toBe('COUNSEL_ACCEPTED');
    expect(report.optionalMaxAssurance.blocksLegalLaunch).toBe(false);
  });
});
