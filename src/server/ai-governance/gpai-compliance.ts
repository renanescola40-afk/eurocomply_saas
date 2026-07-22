export interface GpaiComplianceInput {
  isGeneralPurposeModel: boolean | null;
  systemicRisk: boolean | null;
  providerRoleConfirmed: boolean;
  modelDocumentationEvidenceIds: string[];
  trainingContentSummaryEvidenceIds: string[];
  copyrightPolicyEvidenceIds: string[];
  downstreamInformationEvidenceIds: string[];
  evaluationEvidenceIds: string[];
  adversarialTestingEvidenceIds: string[];
  incidentReportingConfigured: boolean;
  cybersecurityControlsEvidenceIds: string[];
  energyEfficiencyEvidenceIds: string[];
  codeOfPracticeAssessment?: 'aligned' | 'not_aligned' | 'not_assessed';
  qualifiedReviewerId?: string | null;
  approvedBy?: string | null;
  materialChangePending: boolean;
  openCriticalFindings: number;
}

export interface GpaiDecision {
  status: 'not_applicable' | 'assessment_required' | 'blocked' | 'ready_for_review';
  blockers: string[];
  systemicRiskControlsRequired: boolean;
}

export function decideGpaiCompliance(input: GpaiComplianceInput): GpaiDecision {
  if (input.isGeneralPurposeModel === false) return { status: 'not_applicable', blockers: [], systemicRiskControlsRequired: false };
  const blockers: string[] = [];
  if (input.isGeneralPurposeModel === null) blockers.push('gpai_applicability_unresolved');
  if (!input.providerRoleConfirmed) blockers.push('provider_role_unconfirmed');
  if (input.modelDocumentationEvidenceIds.length === 0) blockers.push('model_documentation_missing');
  if (input.trainingContentSummaryEvidenceIds.length === 0) blockers.push('training_content_summary_missing');
  if (input.copyrightPolicyEvidenceIds.length === 0) blockers.push('copyright_policy_missing');
  if (input.downstreamInformationEvidenceIds.length === 0) blockers.push('downstream_information_missing');
  if (input.systemicRisk === null) blockers.push('systemic_risk_unresolved');
  if (input.systemicRisk === true) {
    if (input.evaluationEvidenceIds.length === 0) blockers.push('model_evaluation_missing');
    if (input.adversarialTestingEvidenceIds.length === 0) blockers.push('adversarial_testing_missing');
    if (!input.incidentReportingConfigured) blockers.push('incident_reporting_missing');
    if (input.cybersecurityControlsEvidenceIds.length === 0) blockers.push('cybersecurity_evidence_missing');
    if (input.energyEfficiencyEvidenceIds.length === 0) blockers.push('energy_efficiency_evidence_missing');
  }
  if (!input.qualifiedReviewerId) blockers.push('qualified_review_missing');
  if (!input.approvedBy) blockers.push('approval_missing');
  if (input.materialChangePending) blockers.push('material_change_reassessment_required');
  if (input.openCriticalFindings > 0) blockers.push('critical_findings_open');
  return {
    status: blockers.length ? (input.isGeneralPurposeModel === null ? 'assessment_required' : 'blocked') : 'ready_for_review',
    blockers,
    systemicRiskControlsRequired: input.systemicRisk === true,
  };
}
