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

function acceptedFounderFacts(artifact, expectedSha) {
  const document = artifact.document;
  if (!document || artifact.error || !expectedSha) return false;
  const officer = document.authorisedOfficer;
  if (!officer || typeof officer !== 'object' || Array.isArray(officer)) return false;
  return (
    normalise(document.status) === 'FOUNDER_FACTS_CONFIRMED' &&
    firstString(document, ['productSha', 'product_sha', 'sourceSha', 'source_sha']) === expectedSha &&
    Boolean(firstString(officer, ['name'])) &&
    Boolean(firstString(officer, ['role'])) &&
    Boolean(firstString(officer, ['confirmedAt'])) &&
    Boolean(firstString(officer, ['signedArtifactReference'])) &&
    SHA256_PATTERN.test(firstString(officer, ['factsDigest']))
  );
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
  const founderFactsAccepted = acceptedFounderFacts(founderArtifact, expectedSha);
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
