import { describe, expect, it } from 'vitest';
import { decideConformityLifecycle } from './conformity-assessment';

const base = {
  highRiskApplicable: true as const,
  assessmentRoute: 'internal_control' as const,
  notifiedBodyRequired: false,
  notifiedBodyEvidenceIds: [],
  annexIvApproved: true,
  qmsApproved: true,
  riskManagementApproved: true,
  euDeclarationVersion: '1.0',
  declarationApprovedBy: 'approver',
  ceMarkingEvidenceIds: ['ce'],
  registrationEvidenceIds: ['reg'],
  openCriticalFindings: 0,
  materialChangePending: false,
};

describe('conformity lifecycle', () => {
  it('blocks unresolved applicability', () => {
    expect(decideConformityLifecycle({ ...base, highRiskApplicable: null }).blockers).toContain('high_risk_applicability_unresolved');
  });
  it('blocks missing technical prerequisites', () => {
    expect(decideConformityLifecycle({ ...base, annexIvApproved: false }).blockers).toContain('annex_iv_not_approved');
  });
  it('reaches post-market only with all evidence', () => {
    expect(decideConformityLifecycle(base)).toEqual({ stage: 'post_market', blockers: [], marketPlacementReady: true });
  });
});
