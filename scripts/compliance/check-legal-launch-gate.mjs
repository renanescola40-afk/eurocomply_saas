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
const LEGAL_LAUNCH_READINESS_PATH = 'docs/compliance/evidence/accepted/legal-launch-readiness.json';
const MASTER_DECISION_PATH = 'docs/compliance/evidence/accepted/master-legal-decision.json';
const OUTPUT_PATH = 'artifacts/legal-review/legal-launch-gate.json';
const FULL_SHA = /^[a-f0-9]{40}$/i;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const MANDATORY_LAUNCH_CONTROLS = Object.freeze([
  'ai-act-applicability',
  'controller-processor-roles',
  'privacy-notice-lawful-bases',
  'article-28-dpa',
  'subprocessors-international-transfers',
  'retention-dsr-breach',
  'dpo-dpia-applicability',
  'cookies-eprivacy-analytics-marketing',
  'commercial-terms-publication',
]);

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
 * @param {unknown} document
 * @param {string} expectedSha
 */
export function validateLegalLaunchReadinessDocument(document, expectedSha) {
  /** @type {string[]} */
  const failures = [];
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return {
      accepted: false,
      failures: ['legal_launch_readiness_invalid_document'],
      externalReviewRequired: false,
      controls: [],
    };
  }

  const value = /** @type {Record<string, any>} */ (document);
  if (value.schema !== 'risck-comply.legal-launch-readiness.v1') failures.push('legal_launch_readiness_schema_invalid');
  if (!expectedSha || !FULL_SHA.test(expectedSha) || String(value.productSha || '').toLowerCase() !== expectedSha.toLowerCase()) {
    failures.push('legal_launch_readiness_sha_mismatch');
  }
  if (value.status !== 'LEGAL_LAUNCH_READY') failures.push('legal_launch_readiness_status_not_ready');
  if (value.publicLegalSurfaceEffective !== true) failures.push('public_legal_surface_not_effective');
  if (!ISO_TIME.test(String(value.acceptedAt || ''))) failures.push('legal_launch_readiness_accepted_at_invalid');
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length === 0 || value.evidenceRefs.some((item) => typeof item !== 'string' || !item.trim())) {
    failures.push('legal_launch_readiness_evidence_refs_missing');
  }

  const controls = Array.isArray(value.mandatoryControls) ? value.mandatoryControls : [];
  if (!Array.isArray(value.mandatoryControls)) failures.push('mandatory_controls_missing');

  for (const id of MANDATORY_LAUNCH_CONTROLS) {
    const matches = controls.filter((control) => control && control.id === id);
    if (matches.length !== 1) {
      failures.push(`mandatory_control_${id}_missing_or_duplicate`);
      continue;
    }
    const control = matches[0];
    if (!['PASS', 'NOT_APPLICABLE'].includes(control.status)) {
      failures.push(`mandatory_control_${id}_status_not_accepted`);
      continue;
    }
    if (!Array.isArray(control.evidenceRefs) || control.evidenceRefs.length === 0 || control.evidenceRefs.some((item) => typeof item !== 'string' || !item.trim())) {
      failures.push(`mandatory_control_${id}_evidence_missing`);
    }
    if (control.status === 'NOT_APPLICABLE') {
      if (typeof control.rationale !== 'string' || !control.rationale.trim()) failures.push(`mandatory_control_${id}_na_rationale_missing`);
      if (typeof control.changeTrigger !== 'string' || !control.changeTrigger.trim()) failures.push(`mandatory_control_${id}_na_change_trigger_missing`);
    }
  }

  const externalReview = value.qualifiedExternalReview;
  if (!externalReview || typeof externalReview !== 'object' || Array.isArray(externalReview) || typeof externalReview.required !== 'boolean') {
    failures.push('qualified_external_review_applicability_missing');
  } else {
    if (typeof externalReview.rationale !== 'string' || !externalReview.rationale.trim()) {
      failures.push('qualified_external_review_rationale_missing');
    }
    if (typeof externalReview.changeTrigger !== 'string' || !externalReview.changeTrigger.trim()) {
      failures.push('qualified_external_review_change_trigger_missing');
    }
  }

  return {
    accepted: failures.length === 0,
    failures: [...new Set(failures)].sort(),
    externalReviewRequired: Boolean(externalReview?.required),
    controls,
  };
}

/**
 * @param {{
 *   expectedSha?: string | null,
 *   founderFactsAccepted?: boolean,
 *   founderFactsUnresolvedFields?: string[],
 *   launchReadinessAccepted?: boolean,
 *   launchReadinessFailures?: string[],
 *   repositoryPreparationFailures?: string[],
 *   qualifiedExternalReviewRequired?: boolean,
 *   qualifiedReviewAcceptedCount?: number,
 *   qualifiedReviewRequiredCount?: number,
 *   masterDecisionAccepted?: boolean
 * }} [input]
 */
export function evaluateLegalLaunchDecision({
  expectedSha,
  founderFactsAccepted,
  founderFactsUnresolvedFields = [],
  launchReadinessAccepted = false,
  launchReadinessFailures = [],
  repositoryPreparationFailures = [],
  qualifiedExternalReviewRequired = false,
  qualifiedReviewAcceptedCount = 0,
  qualifiedReviewRequiredCount = QUALIFIED_REVIEW_REQUIREMENTS.length,
  masterDecisionAccepted = false,
} = {}) {
  /** @type {string[]} */
  const blockers = [];
  if (!expectedSha || !FULL_SHA.test(expectedSha)) blockers.push('exact_product_sha_unavailable');
  if (!founderFactsAccepted) blockers.push('founder_facts_not_accepted');
  if (!launchReadinessAccepted) blockers.push('mandatory_legal_launch_controls_not_accepted');
  blockers.push(...launchReadinessFailures.map((item) => `launch_readiness:${item}`));
  if (repositoryPreparationFailures.length > 0) blockers.push('repository_preparation_failed');

  const legalMaxAssuranceAccepted =
    qualifiedReviewAcceptedCount === qualifiedReviewRequiredCount && masterDecisionAccepted;
  if (qualifiedExternalReviewRequired && !legalMaxAssuranceAccepted) {
    blockers.push('triggered_qualified_external_review_not_accepted');
  }

  const accepted = blockers.length === 0;

  return {
    schema: 'risck-comply.legal-launch-gate.v2',
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
      launchReadinessAccepted: Boolean(launchReadinessAccepted),
      launchReadinessFailures,
      repositoryPreparationFailures,
      blockers: [...new Set(blockers)].sort(),
    },
    optionalMaxAssurance: {
      status: legalMaxAssuranceAccepted ? 'COUNSEL_ACCEPTED' : 'OPTIONAL_ASSURANCE_OPEN',
      qualifiedReviewAcceptedCount,
      qualifiedReviewRequiredCount,
      masterDecisionAccepted: Boolean(masterDecisionAccepted),
      requiredForCurrentLaunch: Boolean(qualifiedExternalReviewRequired),
      blocksLegalLaunch: Boolean(qualifiedExternalReviewRequired && !legalMaxAssuranceAccepted),
      changeTrigger:
        'Qualified external legal review becomes mandatory only where an applicable law, regulator, conformity route, contract or actual buyer requirement makes it mandatory for the relevant scope.',
    },
    notice: accepted
      ? 'All mandatory legal-launch controls and factual publication prerequisites are accepted for the exact product SHA. This status is not a legal opinion, regulator approval, certification or buyer acceptance; optional external legal assurance remains separately reported unless specifically triggered.'
      : 'Final factual legal publication remains blocked until every listed mandatory launch prerequisite is complete. Optional qualified legal assurance becomes a blocker only when a documented current-scope trigger makes it mandatory.',
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
    : { accepted: false, unresolvedFields: [] };

  const launchReadinessArtifact = readJson(root, LEGAL_LAUNCH_READINESS_PATH);
  const launchReadinessValidation = launchReadinessArtifact.document && !launchReadinessArtifact.error && expectedSha
    ? validateLegalLaunchReadinessDocument(launchReadinessArtifact.document, expectedSha)
    : {
        accepted: false,
        failures: [`legal_launch_readiness_${launchReadinessArtifact.error ?? 'unavailable'}`],
        externalReviewRequired: false,
        controls: [],
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
      launchReadinessAccepted: launchReadinessValidation.accepted,
      launchReadinessFailures: launchReadinessValidation.failures ?? [],
      repositoryPreparationFailures: [...new Set(repositoryPreparationFailures)].sort(),
      qualifiedExternalReviewRequired: launchReadinessValidation.externalReviewRequired,
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
      legalLaunchReadinessPath: LEGAL_LAUNCH_READINESS_PATH,
      legalLaunchReadinessSourceState: launchReadinessArtifact.error ?? 'present',
      mandatoryLaunchControls: launchReadinessValidation.controls ?? [],
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
