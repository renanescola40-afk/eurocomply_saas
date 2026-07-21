export const ANNEX_IV_SECTIONS = [
  'general_description',
  'system_elements_and_development',
  'monitoring_functioning_and_control',
  'risk_management',
  'data_governance',
  'performance_metrics',
  'human_oversight',
  'cybersecurity',
  'lifecycle_changes',
  'standards_and_specifications',
  'eu_declaration_and_conformity',
  'post_market_monitoring',
] as const;

export type AnnexIvSection = (typeof ANNEX_IV_SECTIONS)[number];
export type AnnexIvSectionStatus =
  | 'not_started'
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'needs_update'
  | 'not_applicable';

export type AnnexIvSectionInput = {
  summary?: string | null;
  evidenceReferences?: string[] | null;
  ownerId?: string | null;
  reviewerId?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  contentDigest?: string | null;
  sourceVersion?: string | null;
  status?: AnnexIvSectionStatus | null;
  lastMaterialChangeAt?: string | null;
};

export type AnnexIvInput = Partial<Record<AnnexIvSection, AnnexIvSectionInput>>;

export type AnnexIvSectionResult = {
  section: AnnexIvSection;
  articleReference: string;
  complete: boolean;
  missing: Array<'summary' | 'evidenceReferences' | 'ownerId' | 'reviewedAt'>;
};

const REFERENCES: Record<AnnexIvSection, string> = {
  general_description: 'Annex IV(1)',
  system_elements_and_development: 'Annex IV(2)',
  monitoring_functioning_and_control: 'Annex IV(3)',
  risk_management: 'Annex IV(4)',
  data_governance: 'Annex IV(2)(d) and Article 10',
  performance_metrics: 'Annex IV(2)(g) and Annex IV(3)',
  human_oversight: 'Annex IV(2)(e) and Article 14',
  cybersecurity: 'Annex IV(2)(h) and Article 15',
  lifecycle_changes: 'Annex IV(5)',
  standards_and_specifications: 'Annex IV(6)',
  eu_declaration_and_conformity: 'Annex IV(7)',
  post_market_monitoring: 'Annex IV(8)',
};

/**
 * Compatibility completeness check used by existing callers.
 * It intentionally verifies presence only; use decideAnnexIvPackage for the
 * fail-closed governance and release-readiness boundary.
 */
export function assessAnnexIv(input: AnnexIvInput) {
  const sections: AnnexIvSectionResult[] = ANNEX_IV_SECTIONS.map((section) => {
    const value = input[section] ?? {};
    const missing: AnnexIvSectionResult['missing'] = [];
    if (!value.summary?.trim()) missing.push('summary');
    if (!value.evidenceReferences?.filter(Boolean).length) missing.push('evidenceReferences');
    if (!value.ownerId?.trim()) missing.push('ownerId');
    if (!value.reviewedAt?.trim()) missing.push('reviewedAt');
    return { section, articleReference: REFERENCES[section], complete: missing.length === 0, missing };
  });

  const completed = sections.filter((section) => section.complete).length;
  const completionPercent = Math.round((completed / sections.length) * 100);
  return {
    version: '2026-07-21.2',
    complete: completed === sections.length,
    completedSections: completed,
    totalSections: sections.length,
    completionPercent,
    sections,
    missingSections: sections.filter((section) => !section.complete).map((section) => section.section),
    evidenceBoundary:
      'Completeness confirms required fields and references are present. It does not validate the truth, legal sufficiency or technical quality of the supplied documentation.',
  };
}

export type AnnexIvApplicability = 'required' | 'not_required' | 'uncertain';
export type AnnexIvPackageStage =
  | 'draft'
  | 'applicability_review'
  | 'authoring'
  | 'review'
  | 'approval'
  | 'approved'
  | 'blocked'
  | 'not_applicable'
  | 'retired';

export type AnnexIvPackageInput = {
  applicability: AnnexIvApplicability;
  highRiskSystem: boolean;
  providerRoleConfirmed: boolean;
  systemVersionRecorded: boolean;
  documentationVersion: number;
  sections: AnnexIvInput;
  traceabilityComplete: boolean;
  dataLineageComplete: boolean;
  validationAndTestingComplete: boolean;
  instructionsForUseAligned: boolean;
  riskManagementLinked: boolean;
  postMarketPlanLinked: boolean;
  conformityAssessmentLinked: boolean;
  changeLogComplete: boolean;
  substantialModificationReviewComplete: boolean;
  openHighFindings: number;
  openCriticalFindings: number;
  accountableOwnerAssigned: boolean;
  independentReviewerAssigned: boolean;
  approverAssigned: boolean;
  legalReviewComplete: boolean;
  approvedAt?: string | null;
  retiredAt?: string | null;
};

export type AnnexIvControl = {
  id: string;
  title: string;
  reference: string;
  required: boolean;
  satisfied: boolean;
  blocking: boolean;
};

export type AnnexIvGovernedSection = {
  section: AnnexIvSection;
  articleReference: string;
  approved: boolean;
  missing: Array<
    | 'summary'
    | 'evidenceReferences'
    | 'ownerId'
    | 'reviewerId'
    | 'reviewedAt'
    | 'approvedAt'
    | 'contentDigest'
    | 'sourceVersion'
    | 'approvedStatus'
    | 'reviewerSeparation'
    | 'changeReview'
  >;
};

export type AnnexIvPackageDecision = {
  version: string;
  stage: AnnexIvPackageStage;
  publicationReady: boolean;
  conformityAssessmentReady: boolean;
  legalReviewRequired: boolean;
  governedSections: AnnexIvGovernedSection[];
  controls: AnnexIvControl[];
  missingControlIds: string[];
  blockingControlIds: string[];
  requiredActions: string[];
  evidenceBoundary: string;
};

const GOVERNANCE_VERSION = '2026-07-21.1';
const SHA256 = /^[a-f0-9]{64}$/;

function control(
  id: string,
  title: string,
  reference: string,
  required: boolean,
  satisfied: boolean,
  blocking = true,
): AnnexIvControl {
  return { id, title, reference, required, satisfied, blocking };
}

function isValidDate(value?: string | null) {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function assessGovernedSections(input: AnnexIvInput): AnnexIvGovernedSection[] {
  return ANNEX_IV_SECTIONS.map((section) => {
    const value = input[section] ?? {};
    const missing: AnnexIvGovernedSection['missing'] = [];
    if (!value.summary?.trim()) missing.push('summary');
    if (!value.evidenceReferences?.filter((reference) => reference?.trim()).length) {
      missing.push('evidenceReferences');
    }
    if (!value.ownerId?.trim()) missing.push('ownerId');
    if (!value.reviewerId?.trim()) missing.push('reviewerId');
    if (!isValidDate(value.reviewedAt)) missing.push('reviewedAt');
    if (!isValidDate(value.approvedAt)) missing.push('approvedAt');
    if (!value.contentDigest || !SHA256.test(value.contentDigest)) missing.push('contentDigest');
    if (!value.sourceVersion?.trim()) missing.push('sourceVersion');
    if (value.status !== 'approved') missing.push('approvedStatus');
    if (value.ownerId && value.reviewerId && value.ownerId === value.reviewerId) {
      missing.push('reviewerSeparation');
    }
    if (
      value.lastMaterialChangeAt &&
      (!isValidDate(value.lastMaterialChangeAt) ||
        !isValidDate(value.reviewedAt) ||
        Date.parse(value.reviewedAt as string) < Date.parse(value.lastMaterialChangeAt))
    ) {
      missing.push('changeReview');
    }
    return {
      section,
      articleReference: REFERENCES[section],
      approved: missing.length === 0,
      missing,
    };
  });
}

export function decideAnnexIvPackage(input: AnnexIvPackageInput): AnnexIvPackageDecision {
  if (!Number.isInteger(input.documentationVersion) || input.documentationVersion < 1) {
    throw new Error('documentationVersion must be a positive integer');
  }
  if (input.openHighFindings < 0 || input.openCriticalFindings < 0) {
    throw new Error('open finding counts cannot be negative');
  }

  const governedSections = assessGovernedSections(input.sections);
  const allSectionsApproved = governedSections.every((section) => section.approved);
  const applicabilityUncertain = input.applicability === 'uncertain';
  const applicabilityRequired = input.applicability === 'required';
  const likelyRequired = input.highRiskSystem && input.providerRoleConfirmed;
  const required = applicabilityRequired || applicabilityUncertain || likelyRequired;
  const severeFindingsOpen = input.openHighFindings > 0 || input.openCriticalFindings > 0;
  const legalReviewRequired = applicabilityUncertain || !input.providerRoleConfirmed || severeFindingsOpen;

  const controls: AnnexIvControl[] = [
    control('AIV-01', 'Applicability rationale recorded', 'Article 11 and Annex IV', true, !applicabilityUncertain, false),
    control('AIV-02', 'Provider role confirmed', 'Articles 3 and 16', required, input.providerRoleConfirmed),
    control('AIV-03', 'AI-system version identified', 'Annex IV(1)', required, input.systemVersionRecorded),
    control('AIV-04', 'Documentation version is controlled', 'Article 11 and document control', required, input.documentationVersion > 0),
    control('AIV-05', 'All Annex IV sections independently approved', 'Annex IV', required, allSectionsApproved),
    control('AIV-06', 'System and evidence traceability complete', 'Annex IV(1)-(3)', required, input.traceabilityComplete),
    control('AIV-07', 'Data provenance and lineage complete', 'Annex IV(2)(d) and Article 10', required, input.dataLineageComplete),
    control('AIV-08', 'Validation and testing evidence complete', 'Annex IV(2)(g)', required, input.validationAndTestingComplete),
    control('AIV-09', 'Instructions for use aligned', 'Annex IV and Article 13', required, input.instructionsForUseAligned),
    control('AIV-10', 'Risk-management record linked', 'Annex IV(4) and Article 9', required, input.riskManagementLinked),
    control('AIV-11', 'Post-market monitoring plan linked', 'Annex IV(8) and Article 72', required, input.postMarketPlanLinked),
    control('AIV-12', 'Conformity workflow linked', 'Articles 11 and 43', required, input.conformityAssessmentLinked),
    control('AIV-13', 'Lifecycle change log complete', 'Annex IV(5)', required, input.changeLogComplete),
    control('AIV-14', 'Substantial-modification review complete', 'Articles 25 and 43', required, input.substantialModificationReviewComplete),
    control('AIV-15', 'No open critical findings', 'Quality and conformity governance', required, input.openCriticalFindings === 0),
    control('AIV-16', 'No open high findings', 'Quality and conformity governance', required, input.openHighFindings === 0),
    control('AIV-17', 'Accountable owner assigned', 'Governance accountability', required, input.accountableOwnerAssigned),
    control('AIV-18', 'Independent reviewer assigned', 'Independent review boundary', required, input.independentReviewerAssigned),
    control('AIV-19', 'Approver assigned', 'Approval accountability', required, input.approverAssigned),
    control('AIV-20', 'Legal review completed where required', 'Legal applicability boundary', legalReviewRequired, input.legalReviewComplete),
    control('AIV-21', 'Package approval timestamp recorded', 'Document approval integrity', required, isValidDate(input.approvedAt)),
  ];

  const missing = controls.filter((item) => item.required && !item.satisfied);
  const blocking = missing.filter((item) => item.blocking);
  const approvalsReady =
    input.accountableOwnerAssigned && input.independentReviewerAssigned && input.approverAssigned;
  const retired = isValidDate(input.retiredAt);

  let stage: AnnexIvPackageStage;
  if (retired) {
    stage = 'retired';
  } else if (input.applicability === 'not_required' && input.legalReviewComplete) {
    stage = 'not_applicable';
  } else if (applicabilityUncertain || (!input.providerRoleConfirmed && input.highRiskSystem)) {
    stage = 'applicability_review';
  } else if (severeFindingsOpen) {
    stage = 'blocked';
  } else if (!allSectionsApproved || !input.traceabilityComplete || !input.dataLineageComplete) {
    stage = 'authoring';
  } else if (
    !input.validationAndTestingComplete ||
    !input.instructionsForUseAligned ||
    !input.riskManagementLinked ||
    !input.postMarketPlanLinked ||
    !input.changeLogComplete ||
    !input.substantialModificationReviewComplete
  ) {
    stage = 'review';
  } else if (!approvalsReady || !input.conformityAssessmentLinked || (legalReviewRequired && !input.legalReviewComplete) || !isValidDate(input.approvedAt)) {
    stage = 'approval';
  } else if (blocking.length > 0) {
    stage = 'blocked';
  } else {
    stage = 'approved';
  }

  const publicationReady = stage === 'approved' && blocking.length === 0;
  const conformityAssessmentReady = publicationReady && input.conformityAssessmentLinked;

  return {
    version: GOVERNANCE_VERSION,
    stage,
    publicationReady,
    conformityAssessmentReady,
    legalReviewRequired,
    governedSections,
    controls,
    missingControlIds: missing.map((item) => item.id),
    blockingControlIds: blocking.map((item) => item.id),
    requiredActions: missing.map((item) => item.title),
    evidenceBoundary:
      'This decision supports Annex IV documentation readiness and evidence governance. It does not validate technical truth, perform an official conformity assessment, certify the AI system, authorize market placement or replace legal and notified-body review.',
  };
}
