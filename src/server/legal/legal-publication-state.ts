import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const QUALIFIED_REVIEW_DECISION_PATHS = Object.freeze([
  'docs/compliance/evidence/accepted/legal-rules-qualified-review.json',
  'docs/compliance/evidence/accepted/prohibited-practices-legal-review.json',
  'docs/compliance/evidence/accepted/article-50-copy-review.json',
  'docs/compliance/evidence/accepted/fria-methodology-review.json',
  'docs/compliance/evidence/accepted/deployer-obligations-legal-review.json',
  'docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json',
  'docs/compliance/evidence/accepted/conformity-qualified-review.json',
  'docs/compliance/evidence/accepted/gpai-legal-review.json',
]);

export const FOUNDER_FACTS_ACCEPTED_PATH =
  'docs/compliance/evidence/accepted/founder-facts.json';
export const MASTER_LEGAL_DECISION_PATH =
  'docs/compliance/evidence/accepted/master-legal-decision.json';

const ACCEPTED_DECISIONS = new Set(['ACCEPTED', 'COUNSEL_ACCEPTED']);
const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;
const PLACEHOLDER_PATTERN = /(?:^|\b)(?:placeholder|example|sample|todo|tbd|replace[ _-]?me|dummy|fake|unknown)(?:\b|$)/i;
const FOUNDER_FACTS_SCHEMA = 'risck-comply.founder-facts.v1';
const QUALIFIED_REVIEW_SCHEMA = 'risck-comply.qualified-review-decision.v1';
const MASTER_DECISION_SCHEMA = 'risck-comply.master-legal-decision-sheet.v1';
const NOT_APPLICABLE_STATUSES = new Set(['NOT_APPLICABLE', 'NOT_REQUIRED']);
const UNRESOLVED_FOUNDER_FACT_VALUES = new Set([
  '',
  'UNKNOWN',
  'TBD',
  'TODO',
  'PENDING',
  'UNDECIDED',
  'NOT_DECIDED',
  'NOT_SET',
  'N/A',
  'NA',
  'NULL',
  'NOT_APPLICABLE',
  'NOT_REQUIRED',
]);

const FOUNDER_FACT_REQUIRED_PATHS = Object.freeze([
  'legalEntity.registeredName',
  'legalEntity.companyNumber',
  'legalEntity.vatNumber',
  'legalEntity.registeredAddress',
  'legalEntity.country',
  'legalEntity.governingLawPreference',
  'legalEntity.legalContact',
  'legalEntity.privacyContact',
  'legalEntity.securityContact',
  'legalEntity.billingContact',
  'legalEntity.supportContact',
  'legalEntity.dpoOrRepresentative',
  'commercial.productionProductName',
  'commercial.productionDomains',
  'commercial.customerTypesAndExcludedUses',
  'commercial.plansAndBilling',
  'commercial.trialRenewalCancellation',
  'commercial.refundSuspensionTermination',
  'commercial.enterpriseOrderForm',
  'commercial.slaCommitments',
  'dataProcessing.productionDataCategories',
  'dataProcessing.roleAllocation',
  'dataProcessing.hostingRegions',
  'dataProcessing.retentionSchedule',
  'dataProcessing.transferMechanisms',
  'dataProcessing.dataSubjectRequestOwner',
  'providers.hosting',
  'providers.databaseAndAuth',
  'providers.billing',
  'providers.observability',
  'providers.analytics',
  'providers.email',
  'providers.support',
  'providers.aiProviders',
  'securityOperations.availabilityCommitment',
  'securityOperations.supportCommitment',
  'securityOperations.incidentCommunication',
  'securityOperations.backupRestoreCommitment',
  'securityOperations.certificationsAuditsPentests',
  'securityOperations.vulnerabilityDisclosureProcess',
  'aiLegalPositioning.serviceBoundaryConfirmed',
  'aiLegalPositioning.customerContentAiProcessing',
  'aiLegalPositioning.excludedUses',
  'aiLegalPositioning.partnerCounselModel',
  'aiLegalPositioning.approvedClaims',
]);

const QUALIFIED_REVIEW_IDS = Object.freeze([
  'legal-rules',
  'prohibited-practices',
  'article-50-copy',
  'fria-methodology',
  'deployer-obligations',
  'high-risk-provider',
  'conformity',
  'gpai',
]);

const QUALIFIED_REVIEW_ID_BY_PATH = new Map(
  QUALIFIED_REVIEW_DECISION_PATHS.map((path, index) => [path, QUALIFIED_REVIEW_IDS[index]]),
);

const MASTER_GLOBAL_DECISION_KEYS = Object.freeze([
  'intendedPurpose',
  'productRole',
  'launchPosition',
  'contractPack',
  'privacyAndDpa',
  'claims',
  'partnerCounselModel',
]);

export type LegalPublicationStatus =
  | 'REVIEW_DRAFT'
  | 'FOUNDER_FACT_REQUIRED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'COUNSEL_ACCEPTED';

export type LegalPublicationArtifact = {
  path: string;
  document: Record<string, unknown> | null;
  error?: 'missing' | 'invalid_json';
};

export type LegalPublicationState = {
  status: LegalPublicationStatus;
  label: string;
  notice: string;
  expectedSha: string | null;
  founderFactsAccepted: boolean;
  qualifiedReviewsAccepted: number;
  qualifiedReviewsRequired: number;
  masterDecisionAccepted: boolean;
  blockers: string[];
  accepted: boolean;
};

type EvaluationInput = {
  expectedSha?: string | null;
  now?: Date;
  founderFacts: LegalPublicationArtifact;
  qualifiedReviews: LegalPublicationArtifact[];
  masterDecision: LegalPublicationArtifact;
};

function normalise(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function firstString(document: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = document[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function meaningfulString(value: unknown): boolean {
  return typeof value === 'string' && Boolean(value.trim()) && !PLACEHOLDER_PATTERN.test(value.trim());
}

function containsPlaceholder(value: unknown): boolean {
  if (typeof value === 'string') return PLACEHOLDER_PATTERN.test(value.trim());
  if (Array.isArray(value)) return value.some((item) => containsPlaceholder(item));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => containsPlaceholder(item));
  }
  return false;
}

function resolvedDecisionContent(value: unknown): boolean {
  if (typeof value === 'string') return meaningfulString(value);
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0 && value.every((item) => resolvedDecisionContent(item));
  if (!value || typeof value !== 'object') return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length > 0 && entries.every(([, item]) => resolvedDecisionContent(item));
}

function validDateRange(document: Record<string, unknown>, now: Date): boolean {
  const start = firstString(document, ['validityStart', 'validity_start']);
  const end = firstString(document, ['validityEnd', 'validity_end']);
  if (!start || !end) return false;
  const startsAt = new Date(start);
  const endsAt = new Date(end);
  return (
    !Number.isNaN(startsAt.getTime()) &&
    !Number.isNaN(endsAt.getTime()) &&
    startsAt <= now &&
    endsAt >= now
  );
}

function validPastOrPresentDate(value: string, now: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= now;
}

function exactSha(document: Record<string, unknown>, expectedSha: string): boolean {
  return (
    firstString(document, [
      'productSha',
      'product_sha',
      'sourceSha',
      'source_sha',
      'targetSha',
      'target_sha',
    ]) === expectedSha
  );
}

function nestedValue(document: Record<string, unknown>, path: string): unknown {
  let current: unknown = document;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function resolvedFounderFact(value: unknown): boolean {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return Boolean(trimmed) && !UNRESOLVED_FOUNDER_FACT_VALUES.has(normalise(trimmed));
  }

  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);

  if (Array.isArray(value)) {
    return value.length > 0 && value.every((item) => resolvedFounderFact(item));
  }

  if (!value || typeof value !== 'object') return false;

  const document = value as Record<string, unknown>;
  const disposition = normalise(document.status ?? document.state ?? document.disposition);
  if (NOT_APPLICABLE_STATUSES.has(disposition)) {
    const rationale = firstString(document, ['rationale', 'reason']);
    return (
      rationale.length >= 10 &&
      !UNRESOLVED_FOUNDER_FACT_VALUES.has(normalise(rationale))
    );
  }

  const entries = Object.entries(document);
  return entries.length > 0 && entries.every(([, item]) => resolvedFounderFact(item));
}

function unresolvedFounderFactPaths(document: Record<string, unknown>): string[] {
  return FOUNDER_FACT_REQUIRED_PATHS.filter(
    (path) => !resolvedFounderFact(nestedValue(document, path)),
  );
}

function acceptedQualifiedReview(
  artifact: LegalPublicationArtifact,
  expectedSha: string,
  now: Date,
): boolean {
  const document = artifact.document;
  if (!document || artifact.error) return false;

  const expectedReviewId = QUALIFIED_REVIEW_ID_BY_PATH.get(artifact.path);
  if (!expectedReviewId) return false;

  const decision = normalise(document.decision ?? document.status);
  const reviewerName = firstString(document, ['reviewerName', 'reviewer_name']);
  const registration = firstString(document, [
    'professionalRegistration',
    'professional_registration',
  ]);
  const jurisdiction = firstString(document, ['jurisdiction']);
  const qualification = firstString(document, [
    'qualificationScope',
    'qualification_scope',
  ]);
  const independence = firstString(document, [
    'independenceDeclaration',
    'independence_declaration',
  ]);
  const conflict = firstString(document, [
    'conflictAssessment',
    'conflict_assessment',
  ]);
  const reviewScope = firstString(document, ['reviewScope', 'review_scope']);
  const signedReference = firstString(document, [
    'signedArtifactReference',
    'signed_artifact_reference',
  ]);
  const evidenceDigest = firstString(document, [
    'evidencePackageDigest',
    'evidence_package_digest',
  ]);
  const decisionDigest = firstString(document, [
    'decisionDigest',
    'decision_digest',
  ]);
  const timestamp = firstString(document, ['timestamp', 'reviewedAt', 'reviewed_at']);

  return (
    document.schema === QUALIFIED_REVIEW_SCHEMA &&
    firstString(document, ['reviewPackageId', 'review_package_id']) === expectedReviewId &&
    ACCEPTED_DECISIONS.has(decision) &&
    [reviewerName, registration, jurisdiction, qualification, independence, conflict, reviewScope, signedReference]
      .every((value) => meaningfulString(value)) &&
    SHA256_PATTERN.test(evidenceDigest) &&
    SHA256_PATTERN.test(decisionDigest) &&
    exactSha(document, expectedSha) &&
    validPastOrPresentDate(timestamp, now) &&
    validDateRange(document, now) &&
    !containsPlaceholder(document)
  );
}

function acceptedFounderFacts(
  artifact: LegalPublicationArtifact,
  expectedSha: string,
  now: Date,
): boolean {
  const document = artifact.document;
  if (!document || artifact.error) return false;

  const status = normalise(document.status);
  const officer = document.authorisedOfficer;
  if (!officer || typeof officer !== 'object' || Array.isArray(officer)) return false;
  const officerDocument = officer as Record<string, unknown>;
  const confirmedAt = firstString(officerDocument, ['confirmedAt']);

  return (
    document.schema === FOUNDER_FACTS_SCHEMA &&
    status === 'FOUNDER_FACTS_CONFIRMED' &&
    exactSha(document, expectedSha) &&
    unresolvedFounderFactPaths(document).length === 0 &&
    resolvedFounderFact(firstString(officerDocument, ['name'])) &&
    resolvedFounderFact(firstString(officerDocument, ['role'])) &&
    validPastOrPresentDate(confirmedAt, now) &&
    resolvedFounderFact(firstString(officerDocument, ['signedArtifactReference'])) &&
    SHA256_PATTERN.test(firstString(officerDocument, ['factsDigest']))
  );
}

function acceptedMasterDecision(
  artifact: LegalPublicationArtifact,
  expectedSha: string,
  now: Date,
): boolean {
  const document = artifact.document;
  if (!document || artifact.error) return false;

  const decision = normalise(document.decision ?? document.status);
  const reviewer = document.reviewer;
  const binding = document.reviewBinding;
  const workstreams = document.workstreamDecisions;
  const globalDecisions = document.globalDecisions;
  const limitations = document.limitations;
  const blockingChanges = document.blockingChanges;

  if (!reviewer || typeof reviewer !== 'object' || Array.isArray(reviewer)) return false;
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return false;
  if (!globalDecisions || typeof globalDecisions !== 'object' || Array.isArray(globalDecisions)) return false;
  if (!Array.isArray(workstreams) || workstreams.length !== QUALIFIED_REVIEW_IDS.length) return false;
  if (!Array.isArray(limitations) || !Array.isArray(blockingChanges)) return false;

  const reviewerDocument = reviewer as Record<string, unknown>;
  const bindingDocument = binding as Record<string, unknown>;
  const globalDocument = globalDecisions as Record<string, unknown>;
  const bindingWithValidity: Record<string, unknown> = {
    validityStart: bindingDocument.validityStart,
    validityEnd: bindingDocument.validityEnd,
  };

  const reviewerComplete = [
    'name',
    'professionalRegistration',
    'jurisdiction',
    'qualificationScope',
    'conflictAssessment',
    'independenceDeclaration',
  ].every((field) => meaningfulString(firstString(reviewerDocument, [field])));

  const reviewedAt = firstString(bindingDocument, ['reviewedAt']);
  const bindingComplete =
    firstString(bindingDocument, ['productSha']) === expectedSha &&
    SHA256_PATTERN.test(firstString(bindingDocument, ['evidencePackageDigest'])) &&
    meaningfulString(firstString(bindingDocument, ['signedOpinionReference'])) &&
    SHA256_PATTERN.test(firstString(bindingDocument, ['decisionDigest'])) &&
    validPastOrPresentDate(reviewedAt, now) &&
    validDateRange(bindingWithValidity, now) &&
    resolvedDecisionContent(bindingDocument.changeTriggers);

  const globalDecisionsAccepted = MASTER_GLOBAL_DECISION_KEYS.every((key) =>
    ACCEPTED_DECISIONS.has(normalise(globalDocument[key])),
  );

  const workstreamIds = workstreams.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
    return firstString(item as Record<string, unknown>, ['id']);
  });
  const uniqueWorkstreamIds = new Set(workstreamIds);
  const exactWorkstreamCoverage =
    uniqueWorkstreamIds.size === QUALIFIED_REVIEW_IDS.length &&
    QUALIFIED_REVIEW_IDS.every((id) => uniqueWorkstreamIds.has(id));
  const allWorkstreamsAccepted = workstreams.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    return ACCEPTED_DECISIONS.has(normalise((item as Record<string, unknown>).decision));
  });

  return (
    document.schema === MASTER_DECISION_SCHEMA &&
    ACCEPTED_DECISIONS.has(decision) &&
    reviewerComplete &&
    bindingComplete &&
    globalDecisionsAccepted &&
    exactWorkstreamCoverage &&
    allWorkstreamsAccepted &&
    meaningfulString(document.permittedReliance) &&
    resolvedDecisionContent(limitations) &&
    blockingChanges.length === 0 &&
    !containsPlaceholder(document)
  );
}

export function evaluateLegalPublicationState({
  expectedSha,
  now = new Date(),
  founderFacts,
  qualifiedReviews,
  masterDecision,
}: EvaluationInput): LegalPublicationState {
  const resolvedSha = expectedSha?.trim() || null;
  const blockers: string[] = [];

  if (!resolvedSha) blockers.push('exact_product_sha_unavailable');

  const founderAccepted = resolvedSha
    ? acceptedFounderFacts(founderFacts, resolvedSha, now)
    : false;
  if (!founderAccepted) blockers.push('founder_facts_not_accepted');

  const acceptedReviews = resolvedSha
    ? qualifiedReviews.filter((artifact) =>
        acceptedQualifiedReview(artifact, resolvedSha, now),
      ).length
    : 0;
  if (acceptedReviews !== QUALIFIED_REVIEW_DECISION_PATHS.length) {
    blockers.push(
      `qualified_reviews_incomplete:${acceptedReviews}/${QUALIFIED_REVIEW_DECISION_PATHS.length}`,
    );
  }

  const masterAccepted = resolvedSha
    ? acceptedMasterDecision(masterDecision, resolvedSha, now)
    : false;
  if (!masterAccepted) blockers.push('master_legal_decision_not_accepted');

  const accepted = blockers.length === 0;
  const status: LegalPublicationStatus = accepted
    ? 'COUNSEL_ACCEPTED'
    : !founderAccepted
      ? 'FOUNDER_FACT_REQUIRED'
      : 'HUMAN_REVIEW_REQUIRED';

  return {
    status,
    label: accepted ? 'Counsel accepted' : 'Legal review draft',
    notice: accepted
      ? 'The published legal materials are bound to the current product SHA and a valid signed legal decision.'
      : 'Public legal materials are informational review drafts until complete signed founder facts and qualified counsel decisions pass the exact-SHA publication gate.',
    expectedSha: resolvedSha,
    founderFactsAccepted: founderAccepted,
    qualifiedReviewsAccepted: acceptedReviews,
    qualifiedReviewsRequired: QUALIFIED_REVIEW_DECISION_PATHS.length,
    masterDecisionAccepted: masterAccepted,
    blockers,
    accepted,
  };
}

function readArtifact(root: string, path: string): LegalPublicationArtifact {
  const absolutePath = join(root, path);
  if (!existsSync(absolutePath)) return { path, document: null, error: 'missing' };

  try {
    const document = JSON.parse(readFileSync(absolutePath, 'utf8')) as Record<
      string,
      unknown
    >;
    return { path, document };
  } catch {
    return { path, document: null, error: 'invalid_json' };
  }
}

export function resolveExpectedLegalPublicationSha(): string | null {
  return (
    process.env.LEGAL_PUBLICATION_EXPECTED_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    null
  );
}

export function getLegalPublicationState({
  root = process.cwd(),
  expectedSha = resolveExpectedLegalPublicationSha(),
  now = new Date(),
}: {
  root?: string;
  expectedSha?: string | null;
  now?: Date;
} = {}): LegalPublicationState {
  return evaluateLegalPublicationState({
    expectedSha,
    now,
    founderFacts: readArtifact(root, FOUNDER_FACTS_ACCEPTED_PATH),
    qualifiedReviews: QUALIFIED_REVIEW_DECISION_PATHS.map((path) =>
      readArtifact(root, path),
    ),
    masterDecision: readArtifact(root, MASTER_LEGAL_DECISION_PATH),
  });
}
