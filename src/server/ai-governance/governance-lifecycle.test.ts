import { describe, expect, it } from 'vitest';
import { assessProhibitedPractices, PROHIBITED_PRACTICE_SIGNALS } from './prohibited-practices';
import { decideGovernanceLifecycle, type GovernanceLifecycleInput } from './governance-lifecycle';

const clearAnswers = Object.fromEntries(PROHIBITED_PRACTICE_SIGNALS.map((signal) => [signal, 'no'])) as Record<(typeof PROHIBITED_PRACTICE_SIGNALS)[number], 'no'>;

function base(overrides: Partial<GovernanceLifecycleInput> = {}): GovernanceLifecycleInput {
  return {
    riskTier: 'high',
    prohibitedPractices: assessProhibitedPractices(clearAnswers),
    intendedPurposeComplete: true,
    dataGovernanceComplete: true,
    technicalDocumentationComplete: true,
    loggingConfigured: true,
    humanOversightAssigned: true,
    accuracyRobustnessCybersecurityReviewed: true,
    fundamentalRightsAssessmentComplete: true,
    conformityAssessmentComplete: true,
    postMarketMonitoringConfigured: true,
    incidentProcessConfigured: true,
    accountableOwnerAssigned: true,
    approverAssigned: true,
    approvedAt: '2026-07-20T00:00:00.000Z',
    retiredAt: null,
    ...overrides,
  };
}

describe('EU AI Act governance lifecycle', () => {
  it('allows production only after all high-risk controls and approval are complete', () => {
    const result = decideGovernanceLifecycle(base());
    expect(result.stage).toBe('approved');
    expect(result.productionUseAllowed).toBe(true);
    expect(result.evidenceStatus).toBe('complete');
    expect(result.missingEvidenceControlIds).toEqual([]);
  });

  it('fails closed when Annex IV or human oversight evidence is missing', () => {
    const result = decideGovernanceLifecycle(base({ technicalDocumentationComplete: false, humanOversightAssigned: false, approvedAt: null }));
    expect(result.stage).toBe('evidence_pending');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.blockingControlIds).toEqual(expect.arrayContaining(['GOV-03', 'GOV-05']));
  });

  it('blocks production when a prohibited-practice signal is positive', () => {
    const prohibited = assessProhibitedPractices({ ...clearAnswers, social_scoring: 'yes' });
    const result = decideGovernanceLifecycle(base({ prohibitedPractices: prohibited }));
    expect(result.stage).toBe('blocked');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.requiredActions.join(' ')).toContain('Block production use');
  });

  it('requires unknown prohibited-practice answers to be resolved', () => {
    const review = assessProhibitedPractices({ ...clearAnswers, criminal_risk_prediction: 'unknown' });
    const result = decideGovernanceLifecycle(base({ prohibitedPractices: review, approvedAt: null }));
    expect(result.stage).toBe('assessment_pending');
    expect(result.productionUseAllowed).toBe(false);
  });

  it('does not require high-risk-only controls for a limited-risk system', () => {
    const result = decideGovernanceLifecycle(base({
      riskTier: 'limited',
      dataGovernanceComplete: false,
      technicalDocumentationComplete: false,
      loggingConfigured: false,
      humanOversightAssigned: false,
      accuracyRobustnessCybersecurityReviewed: false,
      fundamentalRightsAssessmentComplete: false,
      conformityAssessmentComplete: false,
      postMarketMonitoringConfigured: false,
      incidentProcessConfigured: false,
    }));
    expect(result.stage).toBe('approved');
    expect(result.productionUseAllowed).toBe(true);
  });

  it('retirement always removes production approval', () => {
    const result = decideGovernanceLifecycle(base({ retiredAt: '2026-07-20T12:00:00.000Z' }));
    expect(result.stage).toBe('retired');
    expect(result.productionUseAllowed).toBe(false);
  });
});
