#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { auditLegalTruth } from './legal-truth-audit.mjs';
import { validateContractCounselPack } from './validate-contract-counsel-pack.mjs';
import { validateQualifiedReviewPackages } from './validate-qualified-review-packages.mjs';

const FOUNDER_FACTS_PATH = 'docs/compliance/evidence/accepted/founder-facts.json';
const MASTER_DECISION_PATH = 'docs/compliance/evidence/accepted/master-legal-decision.json';
const OUTPUT_PATH = 'artifacts/legal-review/final-legal-publication-gate.json';
const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;
const ACCEPTED = new Set(['ACCEPTED', 'COUNSEL_ACCEPTED']);
const FOUNDER_FACTS_SCHEMA = 'risck-comply.founder-facts.v1';
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
]);
const FOUNDER_FACT_REQUIRED_PATHS = Object.freeze([
  'legalEntity.registeredName',
  'legalEntity.companyNumber',
  'legalEntity.vatNumber',
  'legalEntity.registeredAddress',
  'legalEntity.country',
  'legalEntity.legalContact',
  'legalEntity.privacyContact',
  'legalEntity.securityContact',
  'legalEntity.billingContact',
  'legalEntity.supportContact',
  'legalEntity.dpoOrRepresentative',
  'commercial.productionDomains',
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
  'aiLegalPositioning.serviceBoundaryConfirmed',
  'aiLegalPositioning.customerContentAiProcessing',
  'aiLegalPositioning.excludedUses',
  'aiLegalPositioning.partnerCounselModel',
  'aiLegalPositioning.approvedClaims',
]);

function normalise(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function firstString(document, keys) {
  for (const key of keys) {
    const value = document?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readJson(root, path) {
  const absolutePath = join(root, path);
  if (!existsSync(absolutePath)) return { path, document: null, error: 'missing' };
  try {
    return { path, document: JSON.parse(readFileSync(absolutePath, 'utf8')), error: null };
  } catch {
    return { path, document: null, error: 'invalid_json' };
  }
}

function resolveSha(root) {
  const explicit =
    process.env.LEGAL_PUBLICATION_EXPECTED_SHA?.trim() ||
    process.env.GITHUB_HEAD_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim();
  if (explicit) return explicit;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function validDateRange(document, now) {
  const start = firstString(document, ['validityStart', 'validity_start']);
  const end = firstString(document, ['validityEnd', 'validity_end']);
  if (!start || !end) return false;
  const startsAt = new Date(start);
  const endsAt = new Date(end);
  return !Number.isNaN(startsAt.getTime()) && !Number.isNaN(endsAt.getTime()) && startsAt <= now && endsAt >= now;
}

function validPastOrPresentDate(value, now) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= now;
}

function nestedValue(document, path) {
  let current = document;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function resolvedFounderFact(value) {
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

  const disposition = normalise(value.status ?? value.state ?? value.disposition);
  if (NOT_APPLICABLE_STATUSES.has(disposition)) {
    const rationale = firstString(value, ['rationale', 'reason']);
    return rationale.length >= 10 && !UNRESOLVED_FOUNDER_FACT_VALUES.has(normalise(rationale));
  }

  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([, item]) => resolvedFounderFact(item));
}

function unresolvedFounderFactPaths(document) {
  return FOUNDER_FACT_REQUIRED_PATHS.filter(
    (path) => !resolvedFounderFact(nestedValue(document, path)),
  );
}

export function validateFounderFactsDocument(document, expectedSha, now = new Date()) {
  const unresolvedFields = document && typeof document === 'object'
    ? unresolvedFounderFactPaths(document)
    : [...FOUNDER_FACT_REQUIRED_PATHS];
  const officer = document?.authorisedOfficer;
  const officerDocument = officer && typeof officer === 'object' && !Array.isArray(officer) ? officer : null;
  const confirmedAt = firstString(officerDocument, ['confirmedAt']);

  const schemaValid = document?.schema === FOUNDER_FACTS_SCHEMA;
  const statusValid = normalise(document?.status) === 'FOUNDER_FACTS_CONFIRMED';
  const productShaValid = firstString(document, ['productSha', 'product_sha', 'sourceSha', 'source_sha']) === expectedSha;
  const officerComplete = Boolean(
    officerDocument &&
    resolvedFounderFact(firstString(officerDocument, ['name'])) &&
    resolvedFounderFact(firstString(officerDocument, ['role'])) &&
    validPastOrPresentDate(confirmedAt, now) &&
    resolvedFounderFact(firstString(officerDocument, ['signedArtifactReference'])) &&
    SHA256_PATTERN.test(firstString(officerDocument, ['factsDigest'])),
  );

  return {
    accepted:
      Boolean(document) &&
      schemaValid &&
      statusValid &&
      productShaValid &&
      unresolvedFields.length === 0 &&
      officerComplete,
    schemaValid,
    statusValid,
    productShaValid,
    officerComplete,
    unresolvedFields,
  };
}

function acceptedFounderFacts(artifact, expectedSha, now) {
  const document = artifact.document;
  if (!document || artifact.error || !expectedSha) {
    return {
      accepted: false,
      unresolvedFields: document && typeof document === 'object'
        ? unresolvedFounderFactPaths(document)
        : [...FOUNDER_FACT_REQUIRED_PATHS],
    };
  }
  return validateFounderFactsDocument(document, expectedSha, now);
}

function acceptedMasterDecision(artifact, expectedSha, now) {
  const document = artifact.document;
  if (!document || artifact.error || !expectedSha) return false;
  const reviewer = document.reviewer;
  const binding = document.reviewBinding;
  const workstreams = document.workstreamDecisions;
  if (!reviewer || typeof reviewer !== 'object' || Array.isArray(reviewer)) return false;
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return false;
  if (!Array.isArray(workstreams) || workstreams.length !== 8) return false;

  const reviewerComplete = [
    'name',
    'professionalRegistration',
    'jurisdiction',
    'qualificationScope',
    'conflictAssessment',
    'independenceDeclaration',
  ].every((key) => Boolean(firstString(reviewer, [key])));

  const bindingDocument = {
    validityStart: binding.validityStart,
    validityEnd: binding.validityEnd,
  };

  return (
    ACCEPTED.has(normalise(document.decision ?? document.status)) &&
    reviewerComplete &&
    firstString(binding, ['productSha']) === expectedSha &&
    SHA256_PATTERN.test(firstString(binding, ['evidencePackageDigest'])) &&
    Boolean(firstString(binding, ['signedOpinionReference'])) &&
    SHA256_PATTERN.test(firstString(binding, ['decisionDigest'])) &&
    Boolean(firstString(binding, ['reviewedAt'])) &&
    validDateRange(bindingDocument, now) &&
    workstreams.every((item) => item && typeof item === 'object' && ACCEPTED.has(normalise(item.decision)))
  );
}

function artifactDigest(root, path) {
  const absolutePath = join(root, path);
  if (!existsSync(absolutePath)) return null;
  return `sha256:${createHash('sha256').update(readFileSync(absolutePath)).digest('hex')}`;
}

export function evaluateFinalLegalPublicationGate({
  root = process.cwd(),
  expectedSha = resolveSha(root),
  now = new Date(),
} = {}) {
  const preparationFailures = [];
  const packageReadiness = validateQualifiedReviewPackages({ root });
  const contractReadiness = validateContractCounselPack({ root });
  let legalTruth = null;

  if (packageReadiness.failures.length > 0) preparationFailures.push(...packageReadiness.failures.map((item) => `review_packages:${item}`));
  if (contractReadiness.failures.length > 0) preparationFailures.push(...contractReadiness.failures.map((item) => `contract_pack:${item}`));

  try {
    legalTruth = auditLegalTruth({ root, sourceSha: expectedSha ?? 'UNKNOWN_SOURCE_SHA', now });
  } catch (error) {
    preparationFailures.push(`legal_truth:${error instanceof Error ? error.message : 'audit_failed'}`);
  }

  const founderArtifact = readJson(root, FOUNDER_FACTS_PATH);
  const masterArtifact = readJson(root, MASTER_DECISION_PATH);
  const founderValidation = acceptedFounderFacts(founderArtifact, expectedSha, now);
  const founderFactsAccepted = founderValidation.accepted;
  const acceptedReviewCount = legalTruth?.truth?.acceptedReviewFilesValid ?? 0;
  const expectedReviewCount = legalTruth?.truth?.acceptedReviewFilesExpected ?? 8;
  const allQualifiedReviewsAccepted = expectedReviewCount === 8 && acceptedReviewCount === expectedReviewCount;
  const masterDecisionAccepted = acceptedMasterDecision(masterArtifact, expectedSha, now);

  const blockers = [];
  if (!expectedSha) blockers.push('exact_product_sha_unavailable');
  if (!founderFactsAccepted) blockers.push(`founder_facts:${founderArtifact.error ?? 'not_accepted'}`);
  if (!allQualifiedReviewsAccepted) blockers.push(`qualified_reviews:${acceptedReviewCount}/${expectedReviewCount}`);
  if (!masterDecisionAccepted) blockers.push(`master_decision:${masterArtifact.error ?? 'not_accepted'}`);
  if (preparationFailures.length > 0) blockers.push('repository_preparation_failed');

  const accepted = blockers.length === 0;
  const publicationStatus = accepted
    ? 'COUNSEL_ACCEPTED'
    : !founderFactsAccepted
      ? 'FOUNDER_FACT_REQUIRED'
      : 'HUMAN_REVIEW_REQUIRED';

  return {
    schema: 'risck-comply.final-legal-publication-gate.v1',
    generatedAt: now.toISOString(),
    expectedSha,
    publicationStatus,
    publishFinalLegalDocuments: accepted,
    publicSurfaceMode: accepted ? 'FINAL_COUNSEL_ACCEPTED' : 'INFORMATIONAL_REVIEW_DRAFT',
    repositoryPreparation: {
      ready: preparationFailures.length === 0,
      reviewPackageStatus: packageReadiness.status,
      contractPackStatus: contractReadiness.status,
      legalTruthStatus: legalTruth?.status ?? 'AUDIT_FAILED',
      preparationFailures: [...new Set(preparationFailures)].sort(),
    },
    humanAndExternalEvidence: {
      founderFactsPath: FOUNDER_FACTS_PATH,
      founderFactsAccepted,
      founderFactsDigest: artifactDigest(root, FOUNDER_FACTS_PATH),
      founderFactsUnresolvedFields: founderValidation.unresolvedFields,
      qualifiedReviewAcceptedCount: acceptedReviewCount,
      qualifiedReviewRequiredCount: expectedReviewCount,
      allQualifiedReviewsAccepted,
      masterDecisionPath: MASTER_DECISION_PATH,
      masterDecisionAccepted,
      masterDecisionDigest: artifactDigest(root, MASTER_DECISION_PATH),
    },
    blockers,
    accepted,
    notice: accepted
      ? 'Final legal publication is authorised only for the exact reviewed SHA and current validity period.'
      : 'The repository is prepared for review, but final legal publication remains blocked. Public legal surfaces must remain informational review drafts.',
  };
}

export function writeFinalLegalPublicationGate(report, root = process.cwd()) {
  const path = join(root, OUTPUT_PATH);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  return OUTPUT_PATH;
}

function main() {
  const report = evaluateFinalLegalPublicationGate();
  if (process.argv.includes('--write')) writeFinalLegalPublicationGate(report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (process.argv.includes('--strict') && !report.repositoryPreparation.ready) process.exitCode = 1;
  if (process.argv.includes('--require-accepted') && !report.accepted) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
