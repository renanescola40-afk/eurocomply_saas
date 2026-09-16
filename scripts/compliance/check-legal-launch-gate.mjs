#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  validateFounderFactsDocument,
  validateMasterDecisionDocument,
  validateQualifiedReviewDocument,
} from './check-final-legal-publication-gate.mjs';
import { validateContractCounselPack } from './validate-contract-counsel-pack.mjs';
import { validateQualifiedReviewPackages } from './validate-qualified-review-packages.mjs';

const FOUNDER_FACTS_PATH = 'docs/compliance/evidence/accepted/founder-facts.json';
const MASTER_DECISION_PATH = 'docs/compliance/evidence/accepted/master-legal-decision.json';
const OUTPUT_PATH = 'artifacts/legal-review/legal-launch-gate.json';
const FULL_SHA = /^[a-f0-9]{40}$/i;

const QUALIFIED_REVIEW_REQUIREMENTS = Object.freeze([
  { id: 'legal-rules', path: 'docs/compliance/evidence/accepted/legal-rules-qualified-review.json' },
  { id: 'prohibited-practices', path: 'docs/compliance/evidence/accepted/prohibited-practices-legal-review.json' },
  { id: 'article-50-copy', path: 'docs/compliance/evidence/accepted/article-50-copy-review.json' },
  { id: 'fria-methodology', path: 'docs/compliance/evidence/accepted/fria-methodology-review.json' },
  { id: 'deployer-obligations', path: 'docs/compliance/evidence/accepted/deployer-obligations-legal-review.json' },
  { id: 'high-risk-provider', path: 'docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json' },
  { id: 'conformity', path: 'docs/compliance/evidence/accepted/conformity-qualified-review.json' },
  { id: 'gpai', path: 'docs/compliance/evidence/accepted/gpai-legal-review.json' },
]);

function readJson(root, repositoryPath) {
  const absolutePath = join(root, repositoryPath);
  if (!existsSync(absolutePath)) return { path: repositoryPath, document: null, error: 'missing' };
  try {
    return { path: repositoryPath, document: JSON.parse(readFileSync(absolutePath, 'utf8')), error: null };
  } catch {
    return { path: repositoryPath, document: null, error: 'invalid_json' };
  }
}

function resolveSha(root) {
  const explicit =
    process.env.LEGAL_LAUNCH_EXPECTED_SHA?.trim() ||
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

/**
 * @param {{
 *   expectedSha?: string | null,
 *   founderFactsAccepted?: boolean,
 *   founderFactsUnresolvedFields?: string[],
 *   repositoryPreparationFailures?: string[],
 *   qualifiedReviewAcceptedCount?: number,
 *   qualifiedReviewRequiredCount?: number,
 *   masterDecisionAccepted?: boolean
 * }} [input]
 */
export function evaluateLegalLaunchDecision({
  expectedSha,
  founderFactsAccepted,
  founderFactsUnresolvedFields = [],
  repositoryPreparationFailures = [],
  qualifiedReviewAcceptedCount = 0,
  qualifiedReviewRequiredCount = QUALIFIED_REVIEW_REQUIREMENTS.length,
  masterDecisionAccepted = false,
} = {}) {
  const blockers = [];
  if (!expectedSha || !FULL_SHA.test(expectedSha)) blockers.push('exact_product_sha_unavailable');
  if (!founderFactsAccepted) blockers.push('founder_facts_not_accepted');
  if (repositoryPreparationFailures.length > 0) blockers.push('repository_preparation_failed');

  const accepted = blockers.length === 0;
  const legalMaxAssuranceAccepted =
    qualifiedReviewAcceptedCount === qualifiedReviewRequiredCount && masterDecisionAccepted;

  return {
    schema: 'risck-comply.legal-launch-gate.v1',
    expectedSha: expectedSha || null,
    publicationStatus: accepted
      ? 'LEGAL_LAUNCH_ACCEPTED'
      : !founderFactsAccepted
        ? 'FOUNDER_FACT_REQUIRED'
        : 'LEGAL_LAUNCH_BLOCKED',
    publishFinalLegalDocuments: accepted,
    publicSurfaceMode: accepted
      ? 'FINAL_FACTUAL_LEGAL_PUBLICATION'
      : 'INFORMATIONAL_REVIEW_DRAFT',
    accepted,
    mandatoryLaunch: {
      status: accepted ? 'PASS' : 'NO_PASS',
      founderFactsAccepted: Boolean(founderFactsAccepted),
      founderFactsUnresolvedFields,
      repositoryPreparationFailures,
      blockers,
    },
    optionalMaxAssurance: {
      status: legalMaxAssuranceAccepted ? 'COUNSEL_ACCEPTED' : 'OPTIONAL_ASSURANCE_OPEN',
      qualifiedReviewAcceptedCount,
      qualifiedReviewRequiredCount,
      masterDecisionAccepted: Boolean(masterDecisionAccepted),
      blocksLegalLaunch: false,
      changeTrigger:
        'Qualified external legal review becomes mandatory only where an applicable law, regulator, conformity route, contract or actual buyer requirement makes it mandatory for the relevant scope.',
    },
    notice: accepted
      ? 'Mandatory factual and repository-controlled legal launch prerequisites are complete for the exact product SHA. This status is not a legal opinion, regulator approval, certification or buyer acceptance; optional external legal assurance is reported separately.'
      : 'Final factual legal publication remains blocked until the listed mandatory launch prerequisites are complete. Optional qualified legal assurance is tracked separately and does not become a launch blocker merely because it is absent.',
  };
}

export function evaluateLegalLaunchGate({
  root = process.cwd(),
  expectedSha = resolveSha(root),
  now = new Date(),
} = {}) {
  const packageReadiness = validateQualifiedReviewPackages({ root });
  const contractReadiness = validateContractCounselPack({ root });
  const repositoryPreparationFailures = [
    ...packageReadiness.failures.map((item) => `review_packages:${item}`),
    ...contractReadiness.failures.map((item) => `contract_pack:${item}`),
  ];

  const founderArtifact = readJson(root, FOUNDER_FACTS_PATH);
  const founderValidation = founderArtifact.document && !founderArtifact.error && expectedSha
    ? validateFounderFactsDocument(founderArtifact.document, expectedSha, now)
    : {
        accepted: false,
        unresolvedFields: [],
      };

  const qualifiedReviews = QUALIFIED_REVIEW_REQUIREMENTS.map((requirement) => {
    const artifact = readJson(root, requirement.path);
    if (!artifact.document || artifact.error || !expectedSha) {
      return { id: requirement.id, path: requirement.path, accepted: false };
    }
    const validation = validateQualifiedReviewDocument(
      artifact.document,
      requirement,
      expectedSha,
      now,
    );
    return { id: requirement.id, path: requirement.path, accepted: validation.accepted };
  });
  const qualifiedReviewAcceptedCount = qualifiedReviews.filter((item) => item.accepted).length;

  const masterArtifact = readJson(root, MASTER_DECISION_PATH);
  const masterValidation = masterArtifact.document && !masterArtifact.error && expectedSha
    ? validateMasterDecisionDocument(masterArtifact.document, expectedSha, now)
    : { accepted: false };

  return {
    ...evaluateLegalLaunchDecision({
      expectedSha,
      founderFactsAccepted: founderValidation.accepted,
      founderFactsUnresolvedFields: founderValidation.unresolvedFields ?? [],
      repositoryPreparationFailures: [...new Set(repositoryPreparationFailures)].sort(),
      qualifiedReviewAcceptedCount,
      qualifiedReviewRequiredCount: QUALIFIED_REVIEW_REQUIREMENTS.length,
      masterDecisionAccepted: masterValidation.accepted,
    }),
    generatedAt: now.toISOString(),
    repositoryPreparation: {
      ready: repositoryPreparationFailures.length === 0,
      reviewPackageStatus: packageReadiness.status,
      contractPackStatus: contractReadiness.status,
    },
    evidence: {
      founderFactsPath: FOUNDER_FACTS_PATH,
      founderFactsSourceState: founderArtifact.error ?? 'present',
      qualifiedReviews,
      masterDecisionPath: MASTER_DECISION_PATH,
      masterDecisionSourceState: masterArtifact.error ?? 'present',
    },
  };
}

export function writeLegalLaunchGate(report, root = process.cwd()) {
  const output = join(root, OUTPUT_PATH);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  return OUTPUT_PATH;
}

function main() {
  const report = evaluateLegalLaunchGate();
  if (process.argv.includes('--write')) writeLegalLaunchGate(report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (process.argv.includes('--strict') && !report.repositoryPreparation.ready) process.exitCode = 1;
  if (process.argv.includes('--require-accepted') && !report.accepted) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
