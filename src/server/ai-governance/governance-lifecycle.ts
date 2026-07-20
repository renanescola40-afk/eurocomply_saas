import type { ProhibitedPracticeAssessment } from './prohibited-practices';

export const GOVERNANCE_STAGES = [
  'draft',
  'assessment_pending',
  'evidence_pending',
  'approval_pending',
  'approved',
  'blocked',
  'retired',
] as const;

export type GovernanceStage = (typeof GOVERNANCE_STAGES)[number];
export type RiskTier = 'minimal' | 'limited' | 'high' | 'prohibited_review';
export type EvidenceStatus = 'missing' | 'partial' | 'complete';

export type GovernanceLifecycleInput = {
  riskTier: RiskTier;
  prohibitedPractices: ProhibitedPracticeAssessment;
  intendedPurposeComplete: boolean;
  dataGovernanceComplete: boolean;
  technicalDocumentationComplete: boolean;
  loggingConfigured: boolean;
  humanOversightAssigned: boolean;
  accuracyRobustnessCybersecurityReviewed: boolean;
  fundamentalRightsAssessmentComplete: boolean;
  conformityAssessmentComplete: boolean;
  postMarketMonitoringConfigured: boolean;
  incidentProcessConfigured: boolean;
  accountableOwnerAssigned: boolean;
  approverAssigned: boolean;
  approvedAt?: string | null;
  retiredAt?: string | null;
};

export type GovernanceControl = {
  id: string;
  title: string;
  articleReference: string;
  required: boolean;
  satisfied: boolean;
  blocking: boolean;
};

export type GovernanceLifecycleDecision = {
  version: string;
  stage: GovernanceStage;
  productionUseAllowed: boolean;
  approvalRequired: boolean;
  evidenceStatus: EvidenceStatus;
  controls: GovernanceControl[];
  blockingControlIds: string[];
  missingEvidenceControlIds: string[];
  requiredActions: string[];
  evidenceBoundary: string;
};

const VERSION = '2026-07-20.1';

function control(
  id: string,
  title: string,
  articleReference: string,
  required: boolean,
  satisfied: boolean,
  blocking = true,
): GovernanceControl {
  return { id, title, articleReference, required, satisfied, blocking };
}

export function decideGovernanceLifecycle(input: GovernanceLifecycleInput): GovernanceLifecycleDecision {
  const highRisk = input.riskTier === 'high';
  const controls = [
    control('GOV-01', 'Intended purpose recorded', 'Articles 9 and 11', true, input.intendedPurposeComplete),
    control('GOV-02', 'Data governance evidence complete', 'Article 10', highRisk, input.dataGovernanceComplete),
    control('GOV-03', 'Technical documentation complete', 'Article 11 and Annex IV', highRisk, input.technicalDocumentationComplete),
    control('GOV-04', 'Automatic logging configured', 'Article 12', highRisk, input.loggingConfigured),
    control('GOV-05', 'Human oversight assigned', 'Article 14', highRisk, input.humanOversightAssigned),
    control('GOV-06', 'Accuracy, robustness and cybersecurity reviewed', 'Article 15', highRisk, input.accuracyRobustnessCybersecurityReviewed),
    control('GOV-07', 'Fundamental-rights impact assessment complete', 'Article 27', highRisk, input.fundamentalRightsAssessmentComplete),
    control('GOV-08', 'Conformity assessment complete', 'Articles 43 and 44', highRisk, input.conformityAssessmentComplete),
    control('GOV-09', 'Post-market monitoring configured', 'Article 72', highRisk, input.postMarketMonitoringConfigured),
    control('GOV-10', 'Serious incident process configured', 'Article 73', highRisk, input.incidentProcessConfigured),
    control('GOV-11', 'Accountable owner assigned', 'Governance accountability', true, input.accountableOwnerAssigned),
    control('GOV-12', 'Independent approver assigned', 'Governance approval', true, input.approverAssigned),
  ];

  const prohibitedBlocked = input.prohibitedPractices.blockProductionUse;
  const unresolvedProhibitedReview = input.prohibitedPractices.legalReviewRequired;
  const requiredControls = controls.filter((item) => item.required);
  const blockingControlIds = requiredControls.filter((item) => !item.satisfied && item.blocking).map((item) => item.id);
  const missingEvidenceControlIds = requiredControls.filter((item) => !item.satisfied).map((item) => item.id);
  const allRequiredComplete = missingEvidenceControlIds.length === 0;
  const approvalRecorded = Boolean(input.approvedAt);

  const evidenceStatus: EvidenceStatus = allRequiredComplete
    ? 'complete'
    : requiredControls.some((item) => item.satisfied)
      ? 'partial'
      : 'missing';

  let stage: GovernanceStage;
  if (input.retiredAt) stage = 'retired';
  else if (prohibitedBlocked) stage = 'blocked';
  else if (!input.intendedPurposeComplete || !input.accountableOwnerAssigned) stage = 'draft';
  else if (unresolvedProhibitedReview) stage = 'assessment_pending';
  else if (!allRequiredComplete) stage = 'evidence_pending';
  else if (!approvalRecorded) stage = 'approval_pending';
  else stage = 'approved';

  const productionUseAllowed = stage === 'approved' && !prohibitedBlocked;
  const requiredActions = [
    ...(prohibitedBlocked ? ['Block production use and open accountable legal review.'] : []),
    ...(unresolvedProhibitedReview && !prohibitedBlocked ? ['Resolve every prohibited-practice unknown before approval.'] : []),
    ...missingEvidenceControlIds.map((id) => `Complete and attach evidence for ${id}.`),
    ...(!input.approverAssigned ? ['Assign an approver who is distinct from the accountable owner.'] : []),
    ...(allRequiredComplete && !approvalRecorded ? ['Record an approval decision with timestamp and decision rationale.'] : []),
  ];

  return {
    version: VERSION,
    stage,
    productionUseAllowed,
    approvalRequired: stage === 'approval_pending' || stage === 'evidence_pending' || stage === 'assessment_pending',
    evidenceStatus,
    controls,
    blockingControlIds,
    missingEvidenceControlIds,
    requiredActions: Array.from(new Set(requiredActions)),
    evidenceBoundary: 'Repository decision support only. Approval requires tenant-scoped persisted evidence, accountable human review and applicable legal assessment; this result is not certification or a compliance guarantee.',
  };
}
