import { describe, expect, it } from 'vitest';

import { assessGpaiThirdPartyModel, type GpaiThirdPartyModelInput } from './gpai-third-party-models';

const completeInput: GpaiThirdPartyModelInput = {
  modelNameRecorded: true,
  providerRecorded: true,
  modelVersionRecorded: true,
  intendedUseRecorded: true,
  downstreamIntegrationRecorded: true,
  organizationRole: 'deployer',
  roleRationaleRecorded: true,
  documentationReceived: true,
  limitationsRecorded: true,
  acceptableUseRestrictionsRecorded: true,
  copyrightDocumentationReviewed: false,
  trainingContentSummaryReceived: false,
  riskInformationReceived: true,
  systemicRiskProfile: 'standard',
  systemicRiskIndicatorsReviewed: false,
  contractualRestrictionsReviewed: true,
  changeMonitoringConfigured: true,
  incidentLinkageConfigured: true,
  humanReviewerAssigned: true,
  legalReviewCompleted: true,
  approverAssigned: true,
  approvedAt: '2026-07-21T10:00:00.000Z',
};

describe('assessGpaiThirdPartyModel', () => {
  it('approves a complete standard third-party deployer assessment', () => {
    const decision = assessGpaiThirdPartyModel(completeInput);

    expect(decision.state).toBe('approved');
    expect(decision.approvalAllowed).toBe(true);
    expect(decision.missingControlIds).toEqual([]);
  });

  it('requires review when the organization role is unknown', () => {
    const decision = assessGpaiThirdPartyModel({
      ...completeInput,
      organizationRole: 'unknown',
      roleRationaleRecorded: false,
      legalReviewCompleted: false,
      approvedAt: null,
    });

    expect(decision.state).toBe('review_required');
    expect(decision.approvalAllowed).toBe(false);
    expect(decision.legalReviewRequired).toBe(true);
    expect(decision.missingControlIds).toContain('GPAI-03');
  });

  it('blocks confirmed systemic-risk scope without indicator review', () => {
    const decision = assessGpaiThirdPartyModel({
      ...completeInput,
      systemicRiskProfile: 'systemic_risk_confirmed',
      systemicRiskIndicatorsReviewed: false,
      approvedAt: null,
    });

    expect(decision.state).toBe('blocked');
    expect(decision.approvalAllowed).toBe(false);
    expect(decision.missingControlIds).toContain('GPAI-09');
  });

  it('requires provider-specific copyright and training summary evidence', () => {
    const decision = assessGpaiThirdPartyModel({
      ...completeInput,
      organizationRole: 'provider',
      approvedAt: null,
    });

    expect(decision.state).toBe('evidence_required');
    expect(decision.missingControlIds).toEqual(expect.arrayContaining(['GPAI-06', 'GPAI-07']));
  });

  it('never treats completion as certification or guaranteed compliance', () => {
    const decision = assessGpaiThirdPartyModel(completeInput);

    expect(decision.disclaimer).toContain('not certification');
    expect(decision.disclaimer).toContain('not');
    expect(decision.disclaimer).toContain('guarantee of compliance');
  });
});
