#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

import { validateObservabilityRuntimeEvidence } from './validate-observability-runtime-evidence.mjs';

const sourcePath = 'docs/security/evidence/runtime/observability-smoke-validation.json';
const outputPath = 'docs/security/evidence/runtime/observability-production-validation.json';
const runner = 'scripts/release/run-observability-smoke-validation.mjs';
const FULL_SHA = /^[0-9a-f]{40}$/;

function env(name) {
  return String(process.env[name] || '').trim();
}

function normalizeSha(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return FULL_SHA.test(normalized) ? normalized : null;
}

function readEvidence() {
  if (!existsSync(sourcePath)) return null;
  try {
    return JSON.parse(readFileSync(sourcePath, 'utf8'));
  } catch {
    return null;
  }
}

function expectedShaFailures(evidence, expectedSha) {
  if (!expectedSha) return ['expected_release_sha_invalid'];
  const commitSha = normalizeSha(evidence?.commitSha);
  const buildSha = normalizeSha(evidence?.buildSha);
  return [
    ...(commitSha === expectedSha ? [] : ['observability_commit_sha_mismatch']),
    ...(buildSha === expectedSha ? [] : ['observability_build_sha_mismatch']),
  ];
}

function lifecycleFailures(evidence) {
  return [
    ...(evidence?.status === 'Complete' ? [] : ['observability_status_not_complete']),
    ...(evidence?.outcome === 'passed' ? [] : ['observability_outcome_not_passed']),
  ];
}

function validate(evidence, expectedSha) {
  if (!evidence) return ['observability_source_evidence_missing_or_invalid'];
  return [
    ...lifecycleFailures(evidence),
    ...validateObservabilityRuntimeEvidence(evidence),
    ...expectedShaFailures(evidence, expectedSha),
  ];
}

function runSourceValidator() {
  const result = spawnSync(process.execPath, [runner], {
    env: {
      ...process.env,
      RELEASE_RUN_OBSERVABILITY_SMOKE: 'true',
    },
    stdio: 'inherit',
  });
  if (result.error) return { status: null, error: 'observability_runner_spawn_failed' };
  return { status: result.status, error: null };
}

function safeBlockedEvidence(source, expectedSha, failures, runnerResult) {
  const generatedAt = new Date().toISOString();
  return {
    schema: 'risck-comply.production-observability-validation.v1',
    evidenceItem: 'observability-smoke-validation',
    status: 'Open',
    outcome: 'failed',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    releaseTarget: source?.releaseTarget || env('RELEASE_TARGET') || 'production',
    commitSha: expectedSha,
    buildSha: expectedSha,
    runtimeConfiguration: source?.runtimeConfiguration || {
      targetCount: 0,
      sentryDsnConfigured: Boolean(env('NEXT_PUBLIC_SENTRY_DSN') || env('SENTRY_DSN')),
      authenticatedSmokeEmissionEnabled: true,
      hasProtectedReadinessToken: Boolean(env('HEALTHCHECK_TOKEN')),
      runnerShaBindingValid: false,
      deployedTargetsBoundToExpectedSha: false,
      exactShaBound: false,
    },
    globalChecks: source?.globalChecks || [],
    targets: source?.targets || [],
    failures: [...new Set(failures)],
    summary: 'Production observability evidence is blocked because the canonical exact-SHA smoke evidence did not satisfy its runtime contract.',
    promotion: {
      producer: 'scripts/release/run-production-observability-validation.mjs',
      sourceEvidence: sourcePath,
      canonicalValidator: 'scripts/release/validate-observability-runtime-evidence.mjs',
      sourceRunnerExecuted: runnerResult !== null,
      sourceRunnerExitStatus: runnerResult?.status ?? null,
      expectedShaBound: false,
      downstreamSentryIngestionClaimed: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rawRuntimeReleaseResponseStored: false,
      mismatchedObservedShaStored: false,
      exactShaBound: false,
    },
  };
}

function promotedEvidence(source, expectedSha, runnerResult) {
  return {
    ...source,
    promotion: {
      producer: 'scripts/release/run-production-observability-validation.mjs',
      sourceEvidence: sourcePath,
      canonicalValidator: 'scripts/release/validate-observability-runtime-evidence.mjs',
      sourceRunnerExecuted: runnerResult !== null,
      sourceRunnerExitStatus: runnerResult?.status ?? null,
      expectedShaBound: true,
      downstreamSentryIngestionClaimed: false,
    },
    evidenceLocations: [
      ...new Set([
        ...(Array.isArray(source.evidenceLocations) ? source.evidenceLocations : []),
        sourcePath,
        outputPath,
        'scripts/release/run-production-observability-validation.mjs',
        'scripts/release/validate-observability-runtime-evidence.mjs',
      ]),
    ],
  };
}

function writeEvidence(payload) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
}

const expectedSha = normalizeSha(env('RELEASE_COMMIT_SHA') || env('GITHUB_SHA'));
process.env.RELEASE_RUN_OBSERVABILITY_SMOKE = 'true';

let source = readEvidence();
let failures = validate(source, expectedSha);
let runnerResult = null;

// Public Production Final already emits the canonical authenticated smoke. Reuse
// it only when it is Complete/passed and exact-SHA valid so this closeout does
// not generate duplicate Sentry events. Otherwise regenerate exactly once.
if (failures.length > 0) {
  runnerResult = runSourceValidator();
  source = readEvidence();
  failures = [
    ...validate(source, expectedSha),
    ...(runnerResult?.error ? [runnerResult.error] : []),
    ...(runnerResult && runnerResult.status !== 0 ? ['observability_source_runner_failed'] : []),
  ];
}

if (failures.length > 0) {
  const blocked = safeBlockedEvidence(source, expectedSha, failures, runnerResult);
  writeEvidence(blocked);
  console.error('Production observability validation failed closed.');
  for (const failure of blocked.failures) console.error(`- ${failure}`);
  process.exit(1);
}

const promoted = promotedEvidence(source, expectedSha, runnerResult);
const promotedFailures = validate(promoted, expectedSha);
if (promotedFailures.length > 0) {
  const blocked = safeBlockedEvidence(source, expectedSha, promotedFailures, runnerResult);
  writeEvidence(blocked);
  console.error('Promoted production observability evidence failed canonical validation.');
  process.exit(1);
}

writeEvidence(promoted);
console.log(`Wrote ${outputPath}`);
console.log('Production observability evidence is exact-SHA validated. Downstream Sentry ingestion remains a separate provider proof.');
