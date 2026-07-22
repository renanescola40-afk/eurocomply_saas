import { describe, expect, it } from 'vitest';
import { decideGpaiCompliance } from './gpai-compliance';

const complete = {
  isGeneralPurposeModel: true as const,
  systemicRisk: true as const,
  providerRoleConfirmed: true,
  modelDocumentationEvidenceIds: ['doc'],
  trainingContentSummaryEvidenceIds: ['summary'],
  copyrightPolicyEvidenceIds: ['copyright'],
  downstreamInformationEvidenceIds: ['downstream'],
  evaluationEvidenceIds: ['eval'],
  adversarialTestingEvidenceIds: ['red-team'],
  incidentReportingConfigured: true,
  cybersecurityControlsEvidenceIds: ['cyber'],
  energyEfficiencyEvidenceIds: ['energy'],
  codeOfPracticeAssessment: 'aligned' as const,
  qualifiedReviewerId: 'reviewer',
  approvedBy: 'approver',
  materialChangePending: false,
  openCriticalFindings: 0,
};

describe('GPAI compliance', () => {
  it('fails closed on unresolved applicability', () => {
    expect(decideGpaiCompliance({ ...complete, isGeneralPurposeModel: null }).status).toBe('assessment_required');
  });
  it('requires systemic-risk evaluation evidence', () => {
    expect(decideGpaiCompliance({ ...complete, adversarialTestingEvidenceIds: [] }).blockers).toContain('adversarial_testing_missing');
  });
  it('reaches review-ready only with qualified evidence', () => {
    expect(decideGpaiCompliance(complete)).toEqual({ status: 'ready_for_review', blockers: [], systemicRiskControlsRequired: true });
  });
});
