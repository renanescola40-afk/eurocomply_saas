export const GPAI_ASSESSMENT_VERSION = '2026-07-21.1';

export type OrganizationModelRole =
  | 'provider'
  | 'downstream_provider'
  | 'deployer'
  | 'importer'
  | 'distributor'
  | 'product_manufacturer'
  | 'unknown';

export type ModelRiskProfile = 'standard' | 'systemic_risk_possible' | 'systemic_risk_confirmed' | 'unknown';
export type AssessmentState = 'draft' | 'review_required' | 'evidence_required' | 'approval_required' | 'approved' | 'blocked';

export type GpaiThirdPartyModelInput = {
  modelNameRecorded: boolean;
  providerRecorded: boolean;
  modelVersionRecorded: boolean;
  intendedUseRecorded: boolean;
  downstreamIntegrationRecorded: boolean;
  organizationRole: OrganizationModelRole;
  roleRationaleRecorded: boolean;
  documentationReceived: boolean;
  limitationsRecorded: boolean;
  acceptableUseRestrictionsRecorded: boolean;
  copyrightDocumentationReviewed: boolean;
  trainingContentSummaryReceived: boolean;
  riskInformationReceived: boolean;
  systemicRiskProfile: ModelRiskProfile;
  systemicRiskIndicatorsReviewed: boolean;
  contractualRestrictionsReviewed: boolean;
  changeMonitoringConfigured: boolean;
  incidentLinkageConfigured: boolean;
  humanReviewerAssigned: boolean;
  legalReviewCompleted: boolean;
  approverAssigned: boolean;
  approvedAt?: string | null;
};

export type GpaiControl = {
  id: string;
  title: string;
  legalReference: string;
  required: boolean;
  satisfied: boolean;
  requiresHumanReview: boolean;
};

export type GpaiThirdPartyModelDecision = {
  version: string;
  state: AssessmentState;
  approvalAllowed: boolean;
  legalReviewRequired: boolean;
  controls: GpaiControl[];
  missingControlIds: string[];
  requiredActions: string[];
  disclaimer: string;
};

function control(
  id: string,
  title: string,
  legalReference: string,
  required: boolean,
  satisfied: boolean,
  requiresHumanReview = false,
): GpaiControl {
  return { id, title, legalReference, required, satisfied, requiresHumanReview };
}

export function assessGpaiThirdPartyModel(input: GpaiThirdPartyModelInput): GpaiThirdPartyModelDecision {
  const roleUnknown = input.organizationRole === 'unknown';
  const possibleSystemicRisk = input.systemicRiskProfile === 'systemic_risk_possible' || input.systemicRiskProfile === 'unknown';
  const confirmedSystemicRisk = input.systemicRiskProfile === 'systemic_risk_confirmed';
  const providerLike = input.organizationRole === 'provider' || input.organizationRole === 'downstream_provider';

  const controls = [
    control('GPAI-01', 'Model, provider and version identified', 'EU AI Act model traceability requirements', true, input.modelNameRecorded && input.providerRecorded && input.modelVersionRecorded),
    control('GPAI-02', 'Intended use and downstream integration documented', 'EU AI Act transparency and downstream information duties', true, input.intendedUseRecorded && input.downstreamIntegrationRecorded),
    control('GPAI-03', 'Organization role and rationale recorded', 'EU AI Act operator-role allocation', true, !roleUnknown && input.roleRationaleRecorded, true),
    control('GPAI-04', 'Provider documentation and limitations reviewed', 'EU AI Act GPAI documentation duties', true, input.documentationReceived && input.limitationsRecorded),
    control('GPAI-05', 'Acceptable-use and contractual restrictions reviewed', 'EU AI Act downstream compliance support', true, input.acceptableUseRestrictionsRecorded && input.contractualRestrictionsReviewed),
    control('GPAI-06', 'Copyright-related documentation reviewed', 'EU AI Act GPAI copyright policy and information duties', providerLike, input.copyrightDocumentationReviewed, true),
    control('GPAI-07', 'Training-content summary received where applicable', 'EU AI Act GPAI public information duties', providerLike, input.trainingContentSummaryReceived, true),
    control('GPAI-08', 'Risk information received and evaluated', 'EU AI Act GPAI downstream risk information', true, input.riskInformationReceived),
    control('GPAI-09', 'Systemic-risk indicators reviewed', 'EU AI Act GPAI models with systemic risk', possibleSystemicRisk || confirmedSystemicRisk, input.systemicRiskIndicatorsReviewed, true),
    control('GPAI-10', 'Change and version monitoring configured', 'EU AI Act lifecycle and downstream change management', true, input.changeMonitoringConfigured),
    control('GPAI-11', 'Incident linkage configured', 'EU AI Act serious incident and risk-management support', true, input.incidentLinkageConfigured),
    control('GPAI-12', 'Human reviewer assigned', 'Human accountability and decision governance', true, input.humanReviewerAssigned),
    control('GPAI-13', 'Legal review completed for uncertain role or systemic-risk scope', 'EU AI Act role and systemic-risk applicability', roleUnknown || possibleSystemicRisk, input.legalReviewCompleted, true),
    control('GPAI-14', 'Independent approver assigned', 'Governance approval and separation of duties', true, input.approverAssigned),
  ];

  const requiredControls = controls.filter((item) => item.required);
  const missingControlIds = requiredControls.filter((item) => !item.satisfied).map((item) => item.id);
  const legalReviewRequired = roleUnknown || possibleSystemicRisk || requiredControls.some((item) => item.requiresHumanReview && !item.satisfied);
  const approvalRecorded = Boolean(input.approvedAt);
  const allComplete = missingControlIds.length === 0;

  let state: AssessmentState;
  if (confirmedSystemicRisk && !input.systemicRiskIndicatorsReviewed) state = 'blocked';
  else if (legalReviewRequired && !input.legalReviewCompleted) state = 'review_required';
  else if (!allComplete) state = 'evidence_required';
  else if (!approvalRecorded) state = 'approval_required';
  else state = 'approved';

  const requiredActions = [
    ...(roleUnknown ? ['Determine the organization role and record the rationale before approval.'] : []),
    ...(possibleSystemicRisk && !input.legalReviewCompleted ? ['Obtain human and legal review of possible systemic-risk applicability.'] : []),
    ...(confirmedSystemicRisk && !input.systemicRiskIndicatorsReviewed ? ['Block approval until systemic-risk indicators and applicable obligations are reviewed.'] : []),
    ...missingControlIds.map((id) => `Complete and attach evidence for ${id}.`),
    ...(allComplete && !approvalRecorded ? ['Record an independent approval decision with rationale and timestamp.'] : []),
  ];

  return {
    version: GPAI_ASSESSMENT_VERSION,
    state,
    approvalAllowed: state === 'approved',
    legalReviewRequired,
    controls,
    missingControlIds,
    requiredActions: Array.from(new Set(requiredActions)),
    disclaimer: 'Decision-support workflow only. The organization role, GPAI applicability, systemic-risk status and legal obligations require accountable human review and, where appropriate, qualified legal advice. This assessment is not certification or a guarantee of compliance.',
  };
}
