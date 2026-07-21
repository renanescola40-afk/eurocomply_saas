import { describe, expect, it } from 'vitest';
import {
  decideHighRiskProviderDataGovernance,
  type HighRiskProviderDataGovernanceInput,
} from './high-risk-provider-data-governance';

const complete: HighRiskProviderDataGovernanceInput = {
  applicability: 'required',
  providerRole: 'provider',
  highRiskSystem: true,
  intendedPurposeRecorded: true,
  datasetInventoryComplete: true,
  datasetPurposesRecorded: true,
  sourceCategoriesRecorded: true,
  collectionProvenanceComplete: true,
  acquisitionRightsReviewed: true,
  preparationAndCleaningDocumented: true,
  annotationAndLabelingDocumented: true,
  qualityCriteriaDefined: true,
  relevanceAssessed: true,
  representativenessAssessed: true,
  completenessAssessed: true,
  accuracyAssessed: true,
  statisticalPropertiesAssessed: true,
  protectedGroupsAnalysisComplete: true,
  biasRisksAssessed: true,
  biasMitigationsValidated: true,
  dataGapsDocumented: true,
  trainingValidationTestSeparationVerified: true,
  leakageAssessmentComplete: true,
  lineageIntegrityVerified: true,
  datasetVersionsLocked: true,
  changeControlConfigured: true,
  driftMonitoringConfigured: true,
  postDeploymentFeedbackLoopConfigured: true,
  usesSpecialCategoryData: false,
  specialCategoryDataLegalReviewComplete: false,
  highestResidualRisk: 'medium',
  openHighFindings: 0,
  openCriticalFindings: 0,
  accountableOwnerAssigned: true,
  independentReviewerAssigned: true,
  approverAssigned: true,
  legalReviewComplete: false,
  approvedAt: '2026-07-21T17:00:00.000Z',
};

describe('decideHighRiskProviderDataGovernance', () => {
  it('approves a complete independently reviewed provider data package', () => {
    const result = decideHighRiskProviderDataGovernance(complete);

    expect(result.stage).toBe('approved');
    expect(result.datasetReleaseAllowed).toBe(true);
    expect(result.conformityReadinessAllowed).toBe(true);
    expect(result.controls).toHaveLength(34);
    expect(result.missingControlIds).toEqual([]);
  });

  it('fails closed when applicability is uncertain', () => {
    const result = decideHighRiskProviderDataGovernance({
      ...complete,
      applicability: 'uncertain',
      legalReviewComplete: false,
      approvedAt: null,
    });

    expect(result.stage).toBe('applicability_review');
    expect(result.legalReviewRequired).toBe(true);
    expect(result.datasetReleaseAllowed).toBe(false);
    expect(result.missingControlIds).toContain('PDG-01');
  });

  it('blocks release while severe findings remain open', () => {
    const result = decideHighRiskProviderDataGovernance({
      ...complete,
      openCriticalFindings: 1,
    });

    expect(result.stage).toBe('blocked');
    expect(result.datasetReleaseAllowed).toBe(false);
    expect(result.blockingControlIds).toContain('PDG-30');
  });

  it('requires protected-group analysis and validated bias mitigation', () => {
    const result = decideHighRiskProviderDataGovernance({
      ...complete,
      protectedGroupsAnalysisComplete: false,
      biasMitigationsValidated: false,
      approvedAt: null,
    });

    expect(result.stage).toBe('assessment');
    expect(result.missingControlIds).toEqual(
      expect.arrayContaining(['PDG-17', 'PDG-19']),
    );
  });

  it('requires legal review when special-category data is used', () => {
    const result = decideHighRiskProviderDataGovernance({
      ...complete,
      usesSpecialCategoryData: true,
      specialCategoryDataLegalReviewComplete: false,
      legalReviewComplete: false,
      approvedAt: null,
    });

    expect(result.legalReviewRequired).toBe(true);
    expect(result.stage).toBe('mitigation');
    expect(result.missingControlIds).toEqual(
      expect.arrayContaining(['PDG-28', 'PDG-34']),
    );
  });

  it('keeps the workflow in validation until drift controls are configured', () => {
    const result = decideHighRiskProviderDataGovernance({
      ...complete,
      driftMonitoringConfigured: false,
      approvedAt: null,
    });

    expect(result.stage).toBe('validation');
    expect(result.missingControlIds).toContain('PDG-26');
  });

  it('supports reviewed non-applicability without claiming compliance', () => {
    const result = decideHighRiskProviderDataGovernance({
      ...complete,
      applicability: 'not_required',
      providerRole: 'not_provider',
      highRiskSystem: false,
      legalReviewComplete: true,
      approvedAt: null,
    });

    expect(result.stage).toBe('not_applicable');
    expect(result.datasetReleaseAllowed).toBe(false);
  });

  it('retires a previously approved governance version', () => {
    const result = decideHighRiskProviderDataGovernance({
      ...complete,
      retiredAt: '2026-07-22T00:00:00.000Z',
    });

    expect(result.stage).toBe('retired');
    expect(result.datasetReleaseAllowed).toBe(false);
  });

  it('preserves the evidence and legal boundary', () => {
    expect(
      decideHighRiskProviderDataGovernance(complete).evidenceBoundary,
    ).toContain('does not validate dataset truth');
  });
});
