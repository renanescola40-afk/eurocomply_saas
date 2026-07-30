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

function acceptedQualifiedReview(
  artifact: LegalPublicationArtifact,
  expectedSha: string,
  now: Date,
): boolean {
  const document = artifact.document;
  if (!document || artifact.error) return false;

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

  return (
    ACCEPTED_DECISIONS.has(decision) &&
    Boolean(reviewerName && registration && jurisdiction && qualification) &&
    Boolean(independence && conflict && signedReference) &&
    SHA256_PATTERN.test(evidenceDigest) &&
    SHA256_PATTERN.test(decisionDigest) &&
    exactSha(document, expectedSha) &&
    validDateRange(document, now)
  );
}

function acceptedFounderFacts(
  artifact: LegalPublicationArtifact,
  expectedSha: string,
): boolean {
  const document = artifact.document;
  if (!document || artifact.error) return false;

  const status = normalise(document.status);
  const officer = document.authorisedOfficer;
  if (!officer || typeof officer !== 'object' || Array.isArray(officer)) return false;
  const officerDocument = officer as Record<string, unknown>;

  return (
    status === 'FOUNDER_FACTS_CONFIRMED' &&
    exactSha(document, expectedSha) &&
    Boolean(firstString(officerDocument, ['name'])) &&
    Boolean(firstString(officerDocument, ['role'])) &&
    Boolean(firstString(officerDocument, ['confirmedAt'])) &&
    Boolean(firstString(officerDocument, ['signedArtifactReference'])) &&
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

  if (!reviewer || typeof reviewer !== 'object' || Array.isArray(reviewer)) return false;
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return false;
  if (!Array.isArray(workstreams) || workstreams.length !== 8) return false;

  const reviewerDocument = reviewer as Record<string, unknown>;
  const bindingDocument = binding as Record<string, unknown>;
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
  ].every((field) => Boolean(firstString(reviewerDocument, [field])));

  const bindingComplete =
    firstString(bindingDocument, ['productSha']) === expectedSha &&
    SHA256_PATTERN.test(firstString(bindingDocument, ['evidencePackageDigest'])) &&
    Boolean(firstString(bindingDocument, ['signedOpinionReference'])) &&
    SHA256_PATTERN.test(firstString(bindingDocument, ['decisionDigest'])) &&
    Boolean(firstString(bindingDocument, ['reviewedAt'])) &&
    validDateRange(bindingWithValidity, now);

  const allWorkstreamsAccepted = workstreams.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    return ACCEPTED_DECISIONS.has(normalise((item as Record<string, unknown>).decision));
  });

  return (
    ACCEPTED_DECISIONS.has(decision) &&
    reviewerComplete &&
    bindingComplete &&
    allWorkstreamsAccepted
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
    ? acceptedFounderFacts(founderFacts, resolvedSha)
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
      : 'Public legal materials are informational review drafts until signed founder facts and qualified counsel decisions pass the exact-SHA publication gate.',
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
