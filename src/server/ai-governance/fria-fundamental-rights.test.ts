import { describe, expect, it } from 'vitest';
import { decideFria, type FriaInput } from './fria-fundamental-rights';

const complete: FriaInput = {
  applicability:'required', publicAuthorityOrPublicService:true, highRiskSystem:true,
  intendedPurposeRecorded:true, affectedGroupsIdentified:true, vulnerableGroupsConsidered:true,
  rightsMapped:true, impactAssessmentComplete:true, mitigationPlanComplete:true,
  humanOversightComplete:true, complaintsAndRedressComplete:true, monitoringPlanComplete:true,
  dataProtectionCoordinationComplete:true, highestResidualImpact:'medium',
  accountableOwnerAssigned:true, independentReviewerAssigned:true, approverAssigned:true,
  legalReviewComplete:false, approvedAt:'2026-07-21T12:00:00Z'
};

describe('decideFria', () => {
  it('approves a complete independently approved FRIA', () => {
    const result = decideFria(complete);
    expect(result.stage).toBe('approved');
    expect(result.productionUseAllowed).toBe(true);
  });
  it('fails closed when applicability is uncertain', () => {
    const result = decideFria({...complete, applicability:'uncertain', approvedAt:null});
    expect(result.stage).toBe('applicability_review');
    expect(result.legalReviewRequired).toBe(true);
    expect(result.productionUseAllowed).toBe(false);
  });
  it('blocks severe residual impacts without legal review', () => {
    const result = decideFria({...complete, highestResidualImpact:'critical', legalReviewComplete:false});
    expect(result.stage).toBe('blocked');
    expect(result.productionUseAllowed).toBe(false);
  });
  it('requires mitigation and redress evidence', () => {
    const result = decideFria({...complete, mitigationPlanComplete:false, complaintsAndRedressComplete:false, approvedAt:null});
    expect(result.stage).toBe('mitigation');
    expect(result.missingControlIds).toEqual(expect.arrayContaining(['FRIA-07','FRIA-09']));
  });
  it('preserves the non-legal-opinion boundary', () => {
    expect(decideFria(complete).evidenceBoundary).toContain('does not issue a legal opinion');
  });
});
