export const CONFORMITY_STAGES = [
  'draft',
  'applicability_review',
  'evidence_collection',
  'assessment',
  'external_review',
  'declaration_ready',
  'registration_ready',
  'market_release_review',
  'approved',
  'blocked',
  'retired',
] as const;

export type ConformityStage = (typeof CONFORMITY_STAGES)[number];
export type ConformityApplicability = 'required' | 'not_required' | 'uncertain';
export type ConformityRoute =
  | 'internal_control'
  | 'notified_body'
  | 'product_safety_legislation'
  | 'uncertain';

export type ConformityReadinessInput = {
  applicability: ConformityApplicability;
  highRiskSystem: boolean;
  providerRoleConfirmed: boolean;
  conformityRoute: ConformityRoute;
  routeRationaleRecorded: boolean;
  qmsApproved: boolean;
  riskManagementComplete: boolean;
  dataGovernanceComplete: boolean;
  technicalDocumentationComplete: boolean;
  recordKeepingComplete: boolean;
  transparencyInstructionsComplete: boolean;
  humanOversightComplete: boolean;
  accuracyRobustnessCybersecurityComplete: boolean;
  postMarketPlanApproved: boolean;
  incidentProcessApproved: boolean;
  harmonisedStandardsEvidenceReviewed: boolean;
  commonSpecificationsReviewed: boolean;
  notifiedBodyRequired: boolean;
  notifiedBodyEvidenceComplete: boolean;
  notifiedBodyCertificateValid: boolean;
  authorisedRepresentativeMandateComplete: boolean;
  declarationDraftComplete: boolean;
  declarationRequiredElementsComplete: boolean;
  declarationSignedByAuthorisedPerson: boolean;
  ceMarkingApplicabilityReviewed: boolean;
  ceMarkingControlComplete: boolean;
  euRegistrationRequired: boolean;
  euRegistrationDatasetComplete: boolean;
  euRegistrationSubmitted: boolean;
  registrationIdentifierRecorded: boolean;
  substantialModificationReviewed: boolean;
  openSevereNonconformities: number;
  expiredCertificates: number;
  accountableOwnerAssigned: boolean;
  independentReviewerAssigned: boolean;
  approverAssigned: boolean;
  legalReviewComplete: boolean;
  approvedAt?: string | null;
  retiredAt?: string | null;
};

export type ConformityControl = {
  id: string;
  title: string;
  reference: string;
  required: boolean;
  satisfied: boolean;
  blocking: boolean;
};

export type ConformityReadinessDecision = {
  version: string;
  stage: ConformityStage;
  marketReleaseAllowed: boolean;
  legalReviewRequired: boolean;
  notifiedBodyReviewRequired: boolean;
  controls: ConformityControl[];
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
): ConformityControl {
  return { id, title, reference, required, satisfied, blocking };
}

export function decideConformityReadiness(
  input: ConformityReadinessInput,
): ConformityReadinessDecision {
  const applicabilityUncertain = input.applicability === 'uncertain';
  const routeUncertain = input.conformityRoute === 'uncertain';
  const required = input.applicability === 'required' || applicabilityUncertain || input.highRiskSystem;
  const notifiedBodyReviewRequired =
    required &&
    (input.notifiedBodyRequired ||
      input.conformityRoute === 'notified_body' ||
      input.conformityRoute === 'product_safety_legislation');
  const legalReviewRequired =
    applicabilityUncertain ||
    routeUncertain ||
    !input.providerRoleConfirmed ||
    (required && !input.routeRationaleRecorded);

  const controls: ConformityControl[] = [
    control('CONF-01', 'Applicability and provider role confirmed', 'Articles 16, 43 and 49', true, !applicabilityUncertain && input.providerRoleConfirmed),
    control('CONF-02', 'Conformity route selected and reasoned', 'Article 43 and Annexes VI/VII', required, !routeUncertain && input.routeRationaleRecorded),
    control('CONF-03', 'Quality management system approved', 'Article 17', required, input.qmsApproved),
    control('CONF-04', 'Risk management evidence complete', 'Article 9', required, input.riskManagementComplete),
    control('CONF-05', 'Data governance evidence complete', 'Article 10', required, input.dataGovernanceComplete),
    control('CONF-06', 'Technical documentation complete', 'Article 11 and Annex IV', required, input.technicalDocumentationComplete),
    control('CONF-07', 'Record-keeping controls complete', 'Article 12', required, input.recordKeepingComplete),
    control('CONF-08', 'Transparency and instructions complete', 'Article 13', required, input.transparencyInstructionsComplete),
    control('CONF-09', 'Human oversight controls complete', 'Article 14', required, input.humanOversightComplete),
    control('CONF-10', 'Accuracy, robustness and cybersecurity complete', 'Article 15', required, input.accuracyRobustnessCybersecurityComplete),
    control('CONF-11', 'Post-market monitoring plan approved', 'Article 72', required, input.postMarketPlanApproved),
    control('CONF-12', 'Incident process approved', 'Article 73', required, input.incidentProcessApproved),
    control('CONF-13', 'Harmonised standards evidence reviewed', 'Articles 40 and 43', required, input.harmonisedStandardsEvidenceReviewed, false),
    control('CONF-14', 'Common specifications reviewed', 'Article 41', required, input.commonSpecificationsReviewed, false),
    control('CONF-15', 'Notified-body evidence complete', 'Article 43 and Annex VII', notifiedBodyReviewRequired, input.notifiedBodyEvidenceComplete),
    control('CONF-16', 'Notified-body certificate valid', 'Article 44', notifiedBodyReviewRequired, input.notifiedBodyCertificateValid),
    control('CONF-17', 'Authorised representative mandate complete', 'Article 22', required, input.authorisedRepresentativeMandateComplete, false),
    control('CONF-18', 'EU declaration draft complete', 'Article 47 and Annex V', required, input.declarationDraftComplete),
    control('CONF-19', 'EU declaration required elements complete', 'Article 47 and Annex V', required, input.declarationRequiredElementsComplete),
    control('CONF-20', 'EU declaration signed by authorised person', 'Article 47', required, input.declarationSignedByAuthorisedPerson),
    control('CONF-21', 'CE-marking applicability reviewed', 'Article 48', required, input.ceMarkingApplicabilityReviewed),
    control('CONF-22', 'CE-marking artwork and release control complete', 'Article 48', required, input.ceMarkingControlComplete),
    control('CONF-23', 'EU registration dataset complete', 'Article 49', required && input.euRegistrationRequired, input.euRegistrationDatasetComplete),
    control('CONF-24', 'EU registration submitted', 'Article 49', required && input.euRegistrationRequired, input.euRegistrationSubmitted),
    control('CONF-25', 'EU registration identifier recorded', 'Article 49', required && input.euRegistrationRequired, input.registrationIdentifierRecorded),
    control('CONF-26', 'Substantial-modification assessment complete', 'Articles 25 and 43', required, input.substantialModificationReviewed),
    control('CONF-27', 'No severe nonconformities remain open', 'Conformity release governance', required, input.openSevereNonconformities === 0),
    control('CONF-28', 'No relied-upon certificate is expired', 'Certificate lifecycle governance', notifiedBodyReviewRequired, input.expiredCertificates === 0),
    control('CONF-29', 'Accountable owner assigned', 'Provider accountability', required, input.accountableOwnerAssigned),
    control('CONF-30', 'Independent reviewer assigned', 'Separation of duties', required, input.independentReviewerAssigned),
    control('CONF-31', 'Approver assigned', 'Release accountability', required, input.approverAssigned),
    control('CONF-32', 'Legal review complete where required', 'Legal decision boundary', legalReviewRequired, input.legalReviewComplete),
  ];

  const missing = controls.filter((item) => item.required && !item.satisfied);
  const blocking = missing.filter((item) => item.blocking);
  const evidenceControlsMissing = missing.filter((item) => Number(item.id.slice(5)) <= 14);
  const declarationControlsMissing = missing.filter((item) => ['CONF-18', 'CONF-19', 'CONF-20'].includes(item.id));
  const registrationControlsMissing = missing.filter((item) => ['CONF-23', 'CONF-24', 'CONF-25'].includes(item.id));

  let stage: ConformityStage = 'draft';
  if (input.retiredAt) {
    stage = 'retired';
  } else if (input.applicability === 'not_required' && !input.highRiskSystem && !legalReviewRequired) {
    stage = input.approvedAt ? 'approved' : 'market_release_review';
  } else if (legalReviewRequired && !input.legalReviewComplete) {
    stage = 'applicability_review';
  } else if (input.openSevereNonconformities > 0 || input.expiredCertificates > 0) {
    stage = 'blocked';
  } else if (evidenceControlsMissing.length > 0) {
    stage = 'evidence_collection';
  } else if (notifiedBodyReviewRequired && (!input.notifiedBodyEvidenceComplete || !input.notifiedBodyCertificateValid)) {
    stage = 'external_review';
  } else if (declarationControlsMissing.length > 0) {
    stage = 'declaration_ready';
  } else if (registrationControlsMissing.length > 0) {
    stage = 'registration_ready';
  } else if (blocking.length > 0 || !input.approvedAt) {
    stage = 'market_release_review';
  } else {
    stage = 'approved';
  }

  const marketReleaseAllowed = stage === 'approved' && blocking.length === 0;

  return {
    version: VERSION,
    stage,
    marketReleaseAllowed,
    legalReviewRequired,
    notifiedBodyReviewRequired,
    controls,
    missingControlIds: missing.map((item) => item.id),
    blockingControlIds: blocking.map((item) => item.id),
    requiredActions: missing.map((item) => item.title),
    evidenceBoundary:
      'This readiness decision organises conformity evidence. It does not perform an official conformity assessment, issue or validate an EU declaration, authorise CE marking, complete EU database registration, replace a notified body or provide legal advice.',
  };
}
