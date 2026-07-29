#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SUCCESS_OUTCOMES = new Set(['passed', 'go']);
const REQUIRED_EVIDENCE_KEYS = [
  'enterpriseEnvReadiness',
  'deploymentSmoke',
  'observabilitySmoke',
  'rollbackDryRun',
  'supabaseLiveRls',
  'productionSecretsProviderStores',
  'stripeBillingValidation',
  'uploadScannerValidation',
  'branchProtectionRequiredChecks',
  'authRbacFinalValidation',
  'stepUpMfaValidation',
  'auditChainLiveValidation',
  'externalSecurityReviewOrPentest',
];

export function validateReleaseGoNoGoEvidence(document, {
  expectedCommitSha,
  expectedBuildSha = expectedCommitSha,
  expectedReleaseTarget = 'enterprise',
} = {}) {
  const failures = [];
  const commitSha = String(document?.commitSha ?? '').toLowerCase();
  const buildSha = String(document?.buildSha ?? '').toLowerCase();
  const expectedCommit = String(expectedCommitSha ?? '').toLowerCase();
  const expectedBuild = String(expectedBuildSha ?? '').toLowerCase();

  if (document?.schema !== 'risck-comply.release-go-no-go.v1') failures.push('schema_invalid');
  if (document?.evidenceItem !== 'release-go-no-go') failures.push('evidence_item_invalid');
  if (document?.status !== 'Complete') failures.push('status_must_be_complete');
  if (String(document?.outcome ?? '').toLowerCase() !== 'passed') failures.push('outcome_must_be_passed');
  if (document?.finalDecision !== 'Go') failures.push('final_decision_must_be_go');
  if (document?.goCriteriaSatisfied !== true) failures.push('go_criteria_must_be_satisfied');
  if (!Number.isFinite(Date.parse(document?.generatedAt))) failures.push('generated_at_invalid');
  if (!Number.isFinite(Date.parse(document?.reviewedAt))) failures.push('reviewed_at_invalid');
  if (!SHA_PATTERN.test(expectedCommit)) failures.push('expected_commit_sha_invalid');
  if (!SHA_PATTERN.test(expectedBuild)) failures.push('expected_build_sha_invalid');
  if (!SHA_PATTERN.test(commitSha)) failures.push('commit_sha_invalid');
  if (!SHA_PATTERN.test(buildSha)) failures.push('build_sha_invalid');
  if (SHA_PATTERN.test(expectedCommit) && commitSha !== expectedCommit) failures.push('commit_sha_mismatch');
  if (SHA_PATTERN.test(expectedBuild) && buildSha !== expectedBuild) failures.push('build_sha_mismatch');
  if (document?.releaseTarget !== expectedReleaseTarget) failures.push('release_target_mismatch');
  if (!Array.isArray(document?.p0Blockers) || document.p0Blockers.length !== 0) failures.push('p0_blockers_must_be_empty');
  if (!Array.isArray(document?.deferredRisks) || document.deferredRisks.length !== 0) failures.push('deferred_risks_must_be_empty');
  if (!Array.isArray(document?.controlsVerified) || document.controlsVerified.length === 0) failures.push('controls_verified_missing');
  if (document?.noSecretsStored !== true) failures.push('no_secrets_stored_required');
  if (document?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('sensitive_values_must_be_false');
  if (document?.evidenceIntegrity?.valuesRedacted !== true) failures.push('values_redacted_required');
  if (document?.evidenceIntegrity?.authorizationHeaderStored !== false) failures.push('authorization_header_must_not_be_stored');
  if (document?.evidenceIntegrity?.cookiesStored !== false) failures.push('cookies_must_not_be_stored');

  for (const key of REQUIRED_EVIDENCE_KEYS) {
    const evidence = document?.evidenceFiles?.[key];
    if (!evidence || typeof evidence !== 'object') {
      failures.push(`evidence_${key}_missing`);
      continue;
    }

    if (evidence.present !== true) failures.push(`evidence_${key}_not_present`);
    if (evidence.parseable !== true) failures.push(`evidence_${key}_not_parseable`);
    if (evidence.status !== 'Complete') failures.push(`evidence_${key}_not_complete`);
    if (!SUCCESS_OUTCOMES.has(String(evidence.outcome ?? '').toLowerCase())) {
      failures.push(`evidence_${key}_outcome_invalid`);
    }
    if (evidence.commitBound === true && evidence.shaMatches !== true) {
      failures.push(`evidence_${key}_sha_mismatch`);
    }
  }

  return failures;
}

function runCli() {
  const path = process.argv[2] ?? 'docs/security/evidence/runtime/release-go-no-go.json';
  const expectedCommitSha = process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA;
  const expectedBuildSha = process.env.RELEASE_BUILD_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || expectedCommitSha;
  const expectedReleaseTarget = process.env.RELEASE_TARGET || 'enterprise';
  let document;

  try {
    document = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`Release Go/No-Go evidence is missing or invalid: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const failures = validateReleaseGoNoGoEvidence(document, {
    expectedCommitSha,
    expectedBuildSha,
    expectedReleaseTarget,
  });

  if (failures.length > 0) {
    console.error('Release Go/No-Go evidence validation failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Release Go/No-Go evidence passed for ${expectedCommitSha}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
