export type ConformityStage = 'assessment' | 'technical_file' | 'declaration' | 'ce_marking' | 'registration' | 'post_market';

export interface ConformityInput {
  highRiskApplicable: boolean | null;
  assessmentRoute?: 'internal_control' | 'notified_body' | null;
  notifiedBodyRequired: boolean;
  notifiedBodyEvidenceIds: string[];
  annexIvApproved: boolean;
  qmsApproved: boolean;
  riskManagementApproved: boolean;
  euDeclarationVersion?: string | null;
  declarationApprovedBy?: string | null;
  ceMarkingEvidenceIds: string[];
  registrationEvidenceIds: string[];
  openCriticalFindings: number;
  materialChangePending: boolean;
}

export interface ConformityDecision {
  stage: ConformityStage;
  blockers: string[];
  marketPlacementReady: boolean;
}

export function decideConformityLifecycle(input: ConformityInput): ConformityDecision {
  const blockers: string[] = [];
  if (input.highRiskApplicable === null) blockers.push('high_risk_applicability_unresolved');
  if (input.highRiskApplicable === false) return { stage: 'assessment', blockers, marketPlacementReady: false };
  if (!input.assessmentRoute) blockers.push('assessment_route_missing');
  if (input.notifiedBodyRequired && input.notifiedBodyEvidenceIds.length === 0) blockers.push('notified_body_evidence_missing');
  if (!input.riskManagementApproved) blockers.push('risk_management_not_approved');
  if (!input.qmsApproved) blockers.push('qms_not_approved');
  if (!input.annexIvApproved) blockers.push('annex_iv_not_approved');
  if (input.openCriticalFindings > 0) blockers.push('critical_findings_open');
  if (input.materialChangePending) blockers.push('material_change_reassessment_required');
  if (blockers.length) return { stage: 'assessment', blockers, marketPlacementReady: false };
  if (!input.euDeclarationVersion || !input.declarationApprovedBy) return { stage: 'declaration', blockers: ['eu_declaration_incomplete'], marketPlacementReady: false };
  if (input.ceMarkingEvidenceIds.length === 0) return { stage: 'ce_marking', blockers: ['ce_marking_evidence_missing'], marketPlacementReady: false };
  if (input.registrationEvidenceIds.length === 0) return { stage: 'registration', blockers: ['eu_registration_evidence_missing'], marketPlacementReady: false };
  return { stage: 'post_market', blockers: [], marketPlacementReady: true };
}

export function buildConformityEvidencePack(systemId: string, input: ConformityInput) {
  const decision = decideConformityLifecycle(input);
  return {
    schema: 'risck-comply.conformity-evidence-pack.v1', systemId,
    stage: decision.stage, blockers: decision.blockers,
    marketPlacementReady: decision.marketPlacementReady,
    certificationClaimed: false, regulatorApprovalClaimed: false,
  };
}
