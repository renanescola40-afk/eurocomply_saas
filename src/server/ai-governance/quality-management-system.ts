export const QMS_STAGES = [
  'draft',
  'planning',
  'operating',
  'management_review',
  'approval',
  'approved',
  'blocked',
  'retired',
] as const;

export type QmsStage = (typeof QMS_STAGES)[number];

export type QmsInput = {
  scopeDefined: boolean;
  qualityPolicyApproved: boolean;
  responsibilitiesAssigned: boolean;
  documentControlOperating: boolean;
  recordControlOperating: boolean;
  designDevelopmentControlsOperating: boolean;
  supplierControlsOperating: boolean;
  dataGovernanceLinked: boolean;
  riskManagementLinked: boolean;
  postMarketMonitoringLinked: boolean;
  incidentAndCorrectiveActionLinked: boolean;
  changeControlOperating: boolean;
  competenceAndTrainingLinked: boolean;
  internalAuditComplete: boolean;
  managementReviewComplete: boolean;
  correctiveActionsEffective: boolean;
  regulatoryStrategyReviewed: boolean;
  accountableOwnerAssigned: boolean;
  independentReviewerAssigned: boolean;
  approverAssigned: boolean;
  severeNonconformitiesOpen: number;
  overdueCorrectiveActions: number;
  approvedAt?: string | null;
  retiredAt?: string | null;
};

export type QmsControl = {
  id: string;
  title: string;
  reference: string;
  required: boolean;
  satisfied: boolean;
  blocking: boolean;
};

export type QmsDecision = {
  version: string;
  stage: QmsStage;
  productionUseAllowed: boolean;
  conformityReadinessAllowed: boolean;
  legalReviewRequired: boolean;
  controls: QmsControl[];
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
  satisfied: boolean,
  blocking = true,
): QmsControl {
  return { id, title, reference, required: true, satisfied, blocking };
}

export function decideQualityManagementSystem(input: QmsInput): QmsDecision {
  if (input.severeNonconformitiesOpen < 0 || input.overdueCorrectiveActions < 0) {
    throw new RangeError('QMS nonconformity and corrective-action counters cannot be negative');
  }

  const retired = Boolean(input.retiredAt);
  const severeOpen = input.severeNonconformitiesOpen > 0;
  const overdueActions = input.overdueCorrectiveActions > 0;

  const controls: QmsControl[] = [
    control('QMS-01', 'QMS scope and covered AI systems defined', 'EU AI Act Article 17(1)', input.scopeDefined),
    control('QMS-02', 'Quality policy approved and maintained', 'Article 17(1)(a)', input.qualityPolicyApproved),
    control('QMS-03', 'Responsibilities and authorities assigned', 'Article 17(1)', input.responsibilitiesAssigned),
    control('QMS-04', 'Document control is operating', 'Article 17(1)', input.documentControlOperating),
    control('QMS-05', 'Record retention and control are operating', 'Article 17(1)', input.recordControlOperating),
    control('QMS-06', 'Design and development controls are operating', 'Article 17(1)(b)', input.designDevelopmentControlsOperating),
    control('QMS-07', 'Supplier and third-party controls are operating', 'Article 17(1)', input.supplierControlsOperating),
    control('QMS-08', 'Data governance controls are linked', 'Articles 10 and 17', input.dataGovernanceLinked),
    control('QMS-09', 'Risk management lifecycle is linked', 'Articles 9 and 17', input.riskManagementLinked),
    control('QMS-10', 'Post-market monitoring is linked', 'Articles 17 and 72', input.postMarketMonitoringLinked),
    control('QMS-11', 'Incident and corrective-action lifecycle is linked', 'Articles 17 and 73', input.incidentAndCorrectiveActionLinked),
    control('QMS-12', 'Change control is operating', 'Article 17(1)', input.changeControlOperating),
    control('QMS-13', 'Competence and AI-literacy controls are linked', 'Articles 4 and 17', input.competenceAndTrainingLinked, false),
    control('QMS-14', 'Internal audit completed', 'Article 17 quality assurance', input.internalAuditComplete),
    control('QMS-15', 'Management review completed', 'Article 17 management accountability', input.managementReviewComplete),
    control('QMS-16', 'Corrective actions verified as effective', 'Article 17 continuous improvement', input.correctiveActionsEffective),
    control('QMS-17', 'Regulatory and conformity strategy reviewed', 'Articles 17 and 43', input.regulatoryStrategyReviewed, false),
    control('QMS-18', 'Accountable owner assigned', 'Governance accountability', input.accountableOwnerAssigned),
    control('QMS-19', 'Independent reviewer assigned', 'Separation of duties', input.independentReviewerAssigned),
    control('QMS-20', 'Approver assigned', 'Management approval', input.approverAssigned),
    control('QMS-21', 'No severe nonconformities remain open', 'Article 17 corrective action', !severeOpen),
    control('QMS-22', 'No corrective actions are overdue', 'Article 17 corrective action', !overdueActions),
  ];

  const missingControlIds = controls.filter((item) => item.required && !item.satisfied).map((item) => item.id);
  const blockingControlIds = controls
    .filter((item) => item.required && item.blocking && !item.satisfied)
    .map((item) => item.id);

  const legalReviewRequired = !input.regulatoryStrategyReviewed;
  const allRequiredSatisfied = missingControlIds.length === 0;
  const approved = allRequiredSatisfied && Boolean(input.approvedAt) && !retired;

  let stage: QmsStage;
  if (retired) {
    stage = 'retired';
  } else if (severeOpen || overdueActions) {
    stage = 'blocked';
  } else if (!input.scopeDefined || !input.qualityPolicyApproved || !input.responsibilitiesAssigned) {
    stage = 'planning';
  } else if (
    !input.documentControlOperating ||
    !input.recordControlOperating ||
    !input.designDevelopmentControlsOperating ||
    !input.changeControlOperating ||
    !input.riskManagementLinked
  ) {
    stage = 'operating';
  } else if (!input.internalAuditComplete || !input.managementReviewComplete || !input.correctiveActionsEffective) {
    stage = 'management_review';
  } else if (!approved) {
    stage = 'approval';
  } else {
    stage = 'approved';
  }

  const requiredActions = controls
    .filter((item) => !item.satisfied)
    .map((item) => `Complete ${item.id}: ${item.title}`);

  if (!input.approvedAt && stage === 'approval') {
    requiredActions.push('Record independent management approval and effective date.');
  }

  return {
    version: VERSION,
    stage,
    productionUseAllowed: stage === 'approved',
    conformityReadinessAllowed: stage === 'approved' && !legalReviewRequired,
    legalReviewRequired,
    controls,
    missingControlIds,
    blockingControlIds,
    requiredActions,
    evidenceBoundary:
      'This decision supports QMS readiness and evidence preparation. It does not certify the QMS, perform a conformity assessment, issue a legal opinion, authorize CE marking, or guarantee EU AI Act compliance.',
  };
}
