#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validatePersistentExecutionState } from './check-persistent-execution-state.mjs';
import { validateReleaseGoNoGoEvidence } from '../release/validate-release-go-no-go-evidence.mjs';
import { validateStripeRuntimeEvidence } from '../release/validate-stripe-runtime-evidence.mjs';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const canonicalRepository = 'renanescola40-afk/eurocomply_saas';
const fullSha = /^[0-9a-f]{40}$/;
const numericId = /^\d+$/;
const expectedRetrievalSources = new Map([
  ['enterpriseProductionFinal', {
    workflow: 'enterprise-production-gate.yml',
    paths: [
      'docs/security/evidence/runtime/stripe-billing-validation.json',
      'docs/security/evidence/runtime/enterprise-runtime-evidence.json',
      'docs/security/evidence/runtime/production-final-validation.json',
      'docs/security/evidence/runtime/release-go-no-go.json',
    ],
  }],
  ['enterpriseReadinessScorecard', {
    workflow: 'enterprise-readiness-scorecard.yml',
    paths: [
      'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json',
      'artifacts/enterprise-readiness/persistent-execution-state.json',
    ],
  }],
]);
const evidenceDefinitions = [
  ['retrievalManifest', 'artifacts/enterprise-conversation-closeout/retrieval-manifest.json'],
  ['stripeRuntime', 'docs/security/evidence/runtime/stripe-billing-validation.json'],
  ['enterpriseRuntime', 'docs/security/evidence/runtime/enterprise-runtime-evidence.json'],
  ['productionFinal', 'docs/security/evidence/runtime/production-final-validation.json'],
  ['releaseGoNoGo', 'docs/security/evidence/runtime/release-go-no-go.json'],
  ['canonicalScorecard', 'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json'],
  ['persistentExecutionState', 'artifacts/enterprise-readiness/persistent-execution-state.json'],
];

function readJson(root, path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return { path, exists: false, parseable: false, value: null };
  try {
    return { path, exists: true, parseable: true, value: JSON.parse(readFileSync(absolute, 'utf8')) };
  } catch {
    return { path, exists: true, parseable: false, value: null };
  }
}

function exactSha(value, expectedSha) {
  const candidates = [
    value?.commitSha,
    value?.releaseSha,
    value?.headSha,
    value?.runtimeSha,
    value?.targetSha,
    value?.runtimeProof?.headSha,
  ];
  return candidates.some((candidate) => String(candidate || '').toLowerCase() === expectedSha);
}

function sameStringSet(actual, expected) {
  if (!Array.isArray(actual) || actual.some((value) => typeof value !== 'string')) return false;
  const actualSet = new Set(actual);
  return actualSet.size === expected.length && expected.every((value) => actualSet.has(value));
}

export function validateRetrievalManifest(value, expectedSha) {
  const failures = [];
  if (value?.schema !== 'risck-comply.enterprise-conversation-closeout-retrieval.v1') failures.push('schema_invalid');
  if (value?.repository !== canonicalRepository) failures.push('repository_invalid');
  if (String(value?.targetSha || '').toLowerCase() !== expectedSha) failures.push('target_sha_mismatch');
  if (value?.status !== 'Complete' || value?.outcome !== 'passed') failures.push('retrieval_not_complete');
  if (value?.noSecretsStored !== true) failures.push('no_secrets_stored_required');
  if (!Array.isArray(value?.blockers) || value.blockers.length !== 0) failures.push('retrieval_blockers_present');
  if (!Array.isArray(value?.sources) || value.sources.length !== expectedRetrievalSources.size) {
    failures.push('retrieval_sources_incomplete');
    return failures;
  }

  for (const [key, expected] of expectedRetrievalSources) {
    const matches = value.sources.filter((source) => source?.key === key);
    if (matches.length !== 1) {
      failures.push(`source_${key}_missing_or_duplicate`);
      continue;
    }
    const source = matches[0];
    if (source?.workflow !== expected.workflow) failures.push(`source_${key}_workflow_invalid`);
    if (source?.status !== 'Complete' || source?.failure !== null) failures.push(`source_${key}_not_complete`);
    if (!numericId.test(String(source?.runId || ''))) failures.push(`source_${key}_run_id_invalid`);
    if (!numericId.test(String(source?.artifactId || ''))) failures.push(`source_${key}_artifact_id_invalid`);
    if (!['push', 'workflow_dispatch'].includes(source?.runEvent)) failures.push(`source_${key}_event_invalid`);
    if (!sameStringSet(source?.expectedPaths, expected.paths)) failures.push(`source_${key}_expected_paths_invalid`);
    if (!sameStringSet(source?.extractedPaths, expected.paths)) failures.push(`source_${key}_extracted_paths_invalid`);
    if (typeof source?.artifactName !== 'string' || !source.artifactName.endsWith(expectedSha)) {
      failures.push(`source_${key}_artifact_name_invalid`);
    }
  }
  return failures;
}

function validateEnterpriseRuntime(value, expectedSha) {
  const failures = [];
  if (value?.schema !== 'risck-comply.enterprise-runtime-evidence.v1') failures.push('schema_invalid');
  if (value?.evidenceItem !== 'enterprise-runtime-evidence') failures.push('evidence_item_invalid');
  if (value?.status !== 'Complete' || value?.outcome !== 'passed') failures.push('evidence_not_complete');
  if (value?.releaseTarget !== 'enterprise') failures.push('release_target_invalid');
  if (String(value?.commitSha || '').toLowerCase() !== expectedSha) failures.push('commit_sha_mismatch');
  if (String(value?.buildSha || '').toLowerCase() !== expectedSha) failures.push('build_sha_mismatch');
  if (!Array.isArray(value?.failures) || value.failures.length !== 0) failures.push('failures_present');
  if (value?.noSecretsStored !== true) failures.push('no_secrets_stored_required');
  return failures;
}

function validateProductionFinal(value, expectedSha) {
  const failures = [];
  if (value?.schema !== 'risck-comply.production-final-validation.v2') failures.push('schema_invalid');
  if (value?.evidenceItem !== 'production-final-validation') failures.push('evidence_item_invalid');
  if (value?.status !== 'Complete' || value?.outcome !== 'passed') failures.push('evidence_not_complete');
  if (value?.releaseTarget !== 'enterprise') failures.push('release_target_invalid');
  if (String(value?.commitSha || '').toLowerCase() !== expectedSha) failures.push('commit_sha_mismatch');
  if (String(value?.buildSha || '').toLowerCase() !== expectedSha) failures.push('build_sha_mismatch');
  if (!Array.isArray(value?.commandFailures) || value.commandFailures.length !== 0) failures.push('command_failures_present');
  if (!Array.isArray(value?.evidenceFailures) || value.evidenceFailures.length !== 0) failures.push('evidence_failures_present');
  if (!Array.isArray(value?.metadataFailures) || value.metadataFailures.length !== 0) failures.push('metadata_failures_present');
  if (value?.noSecretsStored !== true) failures.push('no_secrets_stored_required');
  return failures;
}

function validateCanonicalScorecard(scorecard, state, expectedSha, scorecardBytes) {
  const failures = [];
  if (scorecard?.schema !== 'risck-comply.enterprise-readiness-scorecard.v1') failures.push('scorecard_schema_invalid');
  if (scorecard?.generatedFromRealEvidence !== true) failures.push('scorecard_real_evidence_required');
  if (scorecard?.scorePercent !== 100 || scorecard?.completedPercent !== 100 || scorecard?.remainingPercent !== 0) {
    failures.push('scorecard_not_100_percent');
  }
  if (scorecard?.releaseDecision !== 'GO' || scorecard?.criticalOpen !== 0 || scorecard?.criticalFailed !== 0) {
    failures.push('scorecard_not_go');
  }
  if (!Array.isArray(scorecard?.controls) || scorecard.controls.length !== 100 || scorecard.controls.some((control) => control?.status !== 'PASS')) {
    failures.push('scorecard_controls_not_all_pass');
  }

  failures.push(...validatePersistentExecutionState(state, expectedSha).map((failure) => `state_${failure}`));
  if (state?.current_decision !== 'GO' || state?.official_completion_percent !== 100) failures.push('state_not_enterprise_go');
  const digest = createHash('sha256').update(scorecardBytes).digest('hex');
  if (state?.evidence_freshness?.source_scorecard_sha256 !== digest) failures.push('scorecard_digest_mismatch');
  return failures;
}

export function assessConversationFinalCloseout({
  root = repositoryRoot,
  expectedSha,
  generatedAt = new Date().toISOString(),
  now = new Date(),
} = {}) {
  const normalizedSha = String(expectedSha || '').trim().toLowerCase();
  if (!fullSha.test(normalizedSha)) throw new Error('RELEASE_SHA must be a full 40-character commit SHA');

  const evidence = Object.fromEntries(evidenceDefinitions.map(([key, path]) => [key, readJson(root, path)]));
  const validations = {};

  validations.retrievalManifest = evidence.retrievalManifest.parseable
    ? validateRetrievalManifest(evidence.retrievalManifest.value, normalizedSha)
    : ['evidence_missing_or_invalid'];
  validations.stripeRuntime = evidence.stripeRuntime.parseable
    ? validateStripeRuntimeEvidence(evidence.stripeRuntime.value, { now })
    : ['evidence_missing_or_invalid'];
  if (evidence.stripeRuntime.parseable && !exactSha(evidence.stripeRuntime.value, normalizedSha)) {
    validations.stripeRuntime.push('commit_sha_mismatch');
  }
  validations.enterpriseRuntime = evidence.enterpriseRuntime.parseable
    ? validateEnterpriseRuntime(evidence.enterpriseRuntime.value, normalizedSha)
    : ['evidence_missing_or_invalid'];
  validations.productionFinal = evidence.productionFinal.parseable
    ? validateProductionFinal(evidence.productionFinal.value, normalizedSha)
    : ['evidence_missing_or_invalid'];
  validations.releaseGoNoGo = evidence.releaseGoNoGo.parseable
    ? validateReleaseGoNoGoEvidence(evidence.releaseGoNoGo.value, {
      expectedCommitSha: normalizedSha,
      expectedBuildSha: normalizedSha,
      expectedReleaseTarget: 'enterprise',
    })
    : ['evidence_missing_or_invalid'];

  const scorecardBytes = evidence.canonicalScorecard.parseable
    ? readFileSync(join(root, evidence.canonicalScorecard.path))
    : Buffer.from('');
  validations.canonicalScorecard = evidence.canonicalScorecard.parseable && evidence.persistentExecutionState.parseable
    ? validateCanonicalScorecard(
      evidence.canonicalScorecard.value,
      evidence.persistentExecutionState.value,
      normalizedSha,
      scorecardBytes,
    )
    : ['scorecard_or_persistent_state_missing_or_invalid'];

  const required = Object.fromEntries(Object.entries(validations).map(([key, failures]) => [key, failures.length === 0]));
  const blockers = Object.entries(validations)
    .filter(([, failures]) => failures.length > 0)
    .map(([control, failures]) => ({ control, failures }));
  const complete = blockers.length === 0;
  const officialCompletion = evidence.persistentExecutionState.parseable
    && Number.isFinite(evidence.persistentExecutionState.value?.official_completion_percent)
    ? evidence.persistentExecutionState.value.official_completion_percent
    : null;

  const evidenceSummary = evidenceDefinitions.map(([key, path]) => ({
    key,
    path,
    exists: evidence[key].exists,
    parseable: evidence[key].parseable,
    exactSha: evidence[key].parseable ? exactSha(evidence[key].value, normalizedSha) : false,
    validationFailures: validations[key] || [],
  }));
  const retrievalSources = evidence.retrievalManifest.parseable && Array.isArray(evidence.retrievalManifest.value?.sources)
    ? evidence.retrievalManifest.value.sources.map((source) => ({
      key: source?.key || 'unknown',
      workflow: source?.workflow || 'unknown',
      artifactName: source?.artifactName || 'unknown',
      runId: source?.runId || null,
      artifactId: source?.artifactId || null,
      status: source?.status || 'Open',
      failure: source?.failure || null,
    }))
    : [];
  const result = {
    schemaVersion: 3,
    id: 'enterprise-conversation-final-closeout',
    releaseSha: normalizedSha,
    generatedAt,
    status: complete ? 'Complete' : 'Open',
    decision: complete ? 'CONVERSATION_COMPLETE' : 'CONVERSATION_REMAINS_OPEN',
    completionPercentage: complete ? 100 : officialCompletion,
    scoreFreshness: evidence.persistentExecutionState.value?.evidence_freshness?.status || 'UNKNOWN',
    required,
    blockers,
    retrievalSources,
    evidence: evidenceSummary,
    truthBoundary: complete
      ? 'All canonical runtime, release, retrieval-provenance, and exact-SHA 100-control scorecard evidence passed.'
      : 'Conversation closeout remains open. Repository implementation, missing artifacts, or partial runtime proof cannot substitute for a canonical exact-SHA 100-control Enterprise GO.',
  };
  return {
    ...result,
    sha256: createHash('sha256').update(JSON.stringify(result)).digest('hex'),
  };
}

function runCli() {
  const expectedSha = process.env.RELEASE_SHA || process.argv[2] || '';
  const outputPath = process.env.CLOSEOUT_OUTPUT || 'artifacts/enterprise-conversation-closeout/result.json';
  const result = assessConversationFinalCloseout({ expectedSha });
  const absoluteOutput = join(repositoryRoot, outputPath);
  mkdirSync(dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'Complete') process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
