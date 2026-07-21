export const PROVIDER_DATA_GOVERNANCE_STAGES = [
  'draft',
  'applicability_review',
  'inventory',
  'assessment',
  'mitigation',
  'validation',
  'approval',
  'approved',
  'blocked',
  'not_applicable',
  'retired',
] as const;

export type ProviderDataGovernanceStage =
  (typeof PROVIDER_DATA_GOVERNANCE_STAGES)[number];

export type ProviderDataGovernanceApplicability =
  | 'required'
  | 'not_required'
  | 'uncertain';

export type ProviderRole = 'provider' | 'not_provider' | 'uncertain';
export type ResidualDataRisk = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export type HighRiskProviderDataGovernanceInput = {
  applicability: ProviderDataGovernanceApplicability;
  providerRole: ProviderRole;
  highRiskSystem: boolean;
  intendedPurposeRecorded: boolean;
  datasetInventoryComplete: boolean;
  datasetPurposesRecorded: boolean;
  sourceCategoriesRecorded: boolean;
  collectionProvenanceComplete: boolean;
  acquisitionRightsReviewed: boolean;
  preparationAndCleaningDocumented: boolean;
  annotationAndLabelingDocumented: boolean;
  qualityCriteriaDefined: boolean;
  relevanceAssessed: boolean;
  representativenessAssessed: boolean;
  completenessAssessed: boolean;
  accuracyAssessed: boolean;
  statisticalPropertiesAssessed: boolean;
  protectedGroupsAnalysisComplete: boolean;
  biasRisksAssessed: boolean;
  biasMitigationsValidated: boolean;
  dataGapsDocumented: boolean;
  trainingValidationTestSeparationVerified: boolean;
  leakageAssessmentComplete: boolean;
  lineageIntegrityVerified: boolean;
  datasetVersionsLocked: boolean;
  changeControlConfigured: boolean;
  driftMonitoringConfigured: boolean;
  postDeploymentFeedbackLoopConfigured: boolean;
  usesSpecialCategoryData: boolean;
  specialCategoryDataLegalReviewComplete: boolean;
  highestResidualRisk: ResidualDataRisk;
  openHighFindings: number;
  openCriticalFindings: number;
  accountableOwnerAssigned: boolean;
  independentReviewerAssigned: boolean;
  approverAssigned: boolean;
  legalReviewComplete: boolean;
  approvedAt?: string | null;
  retiredAt?: string | null;
};

export type ProviderDataGovernanceControl = {
  id: string;
  title: string;
  reference: string;
  required: boolean;
  satisfied: boolean;
  blocking: boolean;
};

export type ProviderDataGovernanceDecision = {
  version: string;
  stage: ProviderDataGovernanceStage;
  datasetReleaseAllowed: boolean;
  conformityReadinessAllowed: boolean;
  legalReviewRequired: boolean;
  controls: ProviderDataGovernanceControl[];
  missingControlIds: string[];
  blockingControlIds: string[];
  requiredActions: string[];
  evidenceBoundary: string;
};

const VERSION = '2026-07-21.1';

function control(
  id: string,
  title: string,
  reference: string,
  required: boolean,
  satisfied: boolean,
  blocking = true,
): ProviderDataGovernanceControl {
  return { id, title, reference, required, satisfied, blocking };
}

export function decideHighRiskProviderDataGovernance(
  input: HighRiskProviderDataGovernanceInput,
): ProviderDataGovernanceDecision {
  const applicabilityUncertain = input.applicability === 'uncertain';
  const providerRoleUncertain = input.providerRole === 'uncertain';
  const applicable =
    input.applicability === 'required' ||
    applicabilityUncertain ||
    (input.highRiskSystem && input.providerRole === 'provider');
  const notApplicable =
    input.applicability === 'not_required' || input.providerRole === 'not_provider';
  const severeResidualRisk = ['high', 'critical', 'unknown'].includes(
    input.highestResidualRisk,
  );
  const severeFindings =
    input.openHighFindings > 0 || input.openCriticalFindings > 0;
  const specialCategoryReviewRequired = input.usesSpecialCategoryData;
  const legalReviewRequired =
    applicabilityUncertain ||
    providerRoleUncertain ||
    severeResidualRisk ||
    specialCategoryReviewRequired;

  const controls: ProviderDataGovernanceControl[] = [
    control('PDG-01', 'Applicability rationale recorded', 'EU AI Act Articles 10 and 16', true, !applicabilityUncertain, false),
    control('PDG-02', 'Provider role established', 'EU AI Act Article 3 and provider obligations', true, !providerRoleUncertain, false),
    control('PDG-03', 'Intended purpose recorded', 'EU AI Act Articles 9, 10 and 11', applicable, input.intendedPurposeRecorded),
    control('PDG-04', 'Dataset inventory complete', 'EU AI Act Article 10', applicable, input.datasetInventoryComplete),
    control('PDG-05', 'Dataset purposes recorded', 'EU AI Act Article 10(2)', applicable, input.datasetPurposesRecorded),
    control('PDG-06', 'Source categories recorded', 'EU AI Act Article 10(2)', applicable, input.sourceCategoriesRecorded),
    control('PDG-07', 'Collection provenance complete', 'EU AI Act Article 10(2)', applicable, input.collectionProvenanceComplete),
    control('PDG-08', 'Acquisition rights reviewed', 'Data governance and lawful sourcing boundary', applicable, input.acquisitionRightsReviewed, false),
    control('PDG-09', 'Preparation and cleaning documented', 'EU AI Act Article 10(2)', applicable, input.preparationAndCleaningDocumented),
    control('PDG-10', 'Annotation and labeling documented', 'EU AI Act Article 10(2)', applicable, input.annotationAndLabelingDocumented),
    control('PDG-11', 'Quality criteria defined', 'EU AI Act Article 10(3)', applicable, input.qualityCriteriaDefined),
    control('PDG-12', 'Relevance assessed', 'EU AI Act Article 10(3)', applicable, input.relevanceAssessed),
    control('PDG-13', 'Representativeness assessed', 'EU AI Act Article 10(3)', applicable, input.representativenessAssessed),
    control('PDG-14', 'Completeness assessed', 'EU AI Act Article 10(3)', applicable, input.completenessAssessed),
    control('PDG-15', 'Accuracy assessed', 'EU AI Act Article 10(3)', applicable, input.accuracyAssessed),
    control('PDG-16', 'Statistical properties assessed', 'EU AI Act Article 10(3)', applicable, input.statisticalPropertiesAssessed),
    control('PDG-17', 'Protected groups analysis complete', 'Bias and fundamental-rights risk governance', applicable, input.protectedGroupsAnalysisComplete),
    control('PDG-18', 'Bias risks assessed', 'EU AI Act Article 10(2)(f)', applicable, input.biasRisksAssessed),
    control('PDG-19', 'Bias mitigations validated', 'EU AI Act Article 10(2)(f)', applicable, input.biasMitigationsValidated),
    control('PDG-20', 'Data gaps documented', 'EU AI Act Article 10(2) and Annex IV', applicable, input.dataGapsDocumented),
    control('PDG-21', 'Training, validation and test separation verified', 'EU AI Act Article 10(1)', applicable, input.trainingValidationTestSeparationVerified),
    control('PDG-22', 'Data leakage assessment complete', 'Validation integrity and robustness', applicable, input.leakageAssessmentComplete),
    control('PDG-23', 'Lineage integrity verified', 'EU AI Act Articles 10 and 11', applicable, input.lineageIntegrityVerified),
    control('PDG-24', 'Dataset versions locked', 'Technical documentation and change control', applicable, input.datasetVersionsLocked),
    control('PDG-25', 'Dataset change control configured', 'EU AI Act Articles 9, 10 and 11', applicable, input.changeControlConfigured),
    control('PDG-26', 'Data drift monitoring configured', 'EU AI Act Articles 9, 10 and 72', applicable, input.driftMonitoringConfigured),
    control('PDG-27', 'Post-deployment feedback loop configured', 'EU AI Act Articles 10 and 72', applicable, input.postDeploymentFeedbackLoopConfigured),
    control('PDG-28', 'Special-category data legal review complete', 'EU AI Act Article 10(5) and data-protection boundary', specialCategoryReviewRequired, input.specialCategoryDataLegalReviewComplete),
    control('PDG-29', 'Severe residual data risks resolved', 'Risk management and data governance', applicable, !severeResidualRisk),
    control('PDG-30', 'High and critical findings closed', 'Quality and release governance', applicable, !severeFindings),
    control('PDG-31', 'Accountable owner assigned', 'Provider accountability', applicable, input.accountableOwnerAssigned),
    control('PDG-32', 'Independent reviewer assigned', 'Separation of duties', applicable, input.independentReviewerAssigned),
    control('PDG-33', 'Approver assigned', 'Release governance', applicable, input.approverAssigned),
    control('PDG-34', 'Required legal review complete', 'Legal and fundamental-rights boundary', legalReviewRequired, input.legalReviewComplete),
  ];

  const requiredControls = controls.filter((item) => item.required);
  const missingControlIds = requiredControls
    .filter((item) => !item.satisfied)
    .map((item) => item.id);
  const blockingControlIds = requiredControls
    .filter((item) => !item.satisfied && item.blocking)
    .map((item) => item.id);

  const inventoryReady = [
    'PDG-03',
    'PDG-04',
    'PDG-05',
    'PDG-06',
    'PDG-07',
  ].every((id) => !missingControlIds.includes(id));
  const assessmentReady = [
    'PDG-11',
    'PDG-12',
    'PDG-13',
    'PDG-14',
    'PDG-15',
    'PDG-16',
    'PDG-17',
    'PDG-18',
    'PDG-20',
    'PDG-21',
    'PDG-22',
  ].every((id) => !missingControlIds.includes(id));
  const mitigationReady = ['PDG-19', 'PDG-28', 'PDG-29', 'PDG-30'].every(
    (id) => !missingControlIds.includes(id),
  );
  const validationReady = [
    'PDG-23',
    'PDG-24',
    'PDG-25',
    'PDG-26',
    'PDG-27',
  ].every((id) => !missingControlIds.includes(id));
  const approvalsReady = ['PDG-31', 'PDG-32', 'PDG-33', 'PDG-34'].every(
    (id) => !missingControlIds.includes(id),
  );

  let stage: ProviderDataGovernanceStage;
  if (input.retiredAt) stage = 'retired';
  else if (notApplicable && input.legalReviewComplete) stage = 'not_applicable';
  else if (applicabilityUncertain || providerRoleUncertain) stage = 'applicability_review';
  else if (!applicable) stage = 'applicability_review';
  else if (severeResidualRisk || severeFindings) stage = 'blocked';
  else if (!inventoryReady) stage = 'inventory';
  else if (!assessmentReady) stage = 'assessment';
  else if (!mitigationReady) stage = 'mitigation';
  else if (!validationReady) stage = 'validation';
  else if (!approvalsReady || !input.approvedAt) stage = 'approval';
  else stage = 'approved';

  const datasetReleaseAllowed = stage === 'approved';
  const conformityReadinessAllowed = stage === 'approved';
  const requiredActions = [
    ...(applicabilityUncertain || providerRoleUncertain
      ? ['Resolve applicability and provider role through accountable legal review.']
      : []),
    ...(severeResidualRisk
      ? ['Reduce severe or unknown residual data risk before dataset release.']
      : []),
    ...(severeFindings
      ? ['Close every high and critical data-governance finding.']
      : []),
    ...missingControlIds.map((id) => `Complete and evidence ${id}.`),
    ...(missingControlIds.length === 0 && !input.approvedAt
      ? ['Record independent approval with timestamp and rationale.']
      : []),
  ];

  return {
    version: VERSION,
    stage,
    datasetReleaseAllowed,
    conformityReadinessAllowed,
    legalReviewRequired,
    controls,
    missingControlIds,
    blockingControlIds,
    requiredActions: Array.from(new Set(requiredActions)),
    evidenceBoundary:
      'This decision supports high-risk provider data-governance readiness and evidence preparation. It does not validate dataset truth, establish lawful processing, prove absence of bias, certify Article 10 compliance, authorize market placement or replace legal, statistical and domain-expert review.',
  };
}
