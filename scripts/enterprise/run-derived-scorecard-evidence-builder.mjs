#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;

export const DERIVED_SCORECARD_BUILDERS = Object.freeze({
  publicUx: Object.freeze({
    script: 'scripts/enterprise/build-public-ux-evidence.mjs',
    outputs: Object.freeze([
      'docs/security/evidence/runtime/ux-acceptance-validation.json',
      'docs/security/evidence/runtime/localization-validation.json',
    ]),
  }),
  accessibilityConsent: Object.freeze({
    script: 'scripts/enterprise/build-accessibility-consent-evidence.mjs',
    outputs: Object.freeze([
      'docs/security/evidence/runtime/accessibility-validation.json',
      'docs/security/evidence/runtime/analytics-consent-validation.json',
    ]),
  }),
  accountRecovery: Object.freeze({
    script: 'scripts/enterprise/build-account-recovery-evidence.mjs',
    outputs: Object.freeze([
      'docs/security/evidence/runtime/auth-recovery-validation.json',
    ]),
  }),
  providerFailure: Object.freeze({
    script: 'scripts/enterprise/build-provider-failure-evidence.mjs',
    outputs: Object.freeze([
      'docs/security/evidence/runtime/provider-failure-classification.json',
    ]),
  }),
  stepUp: Object.freeze({
    script: 'scripts/enterprise/build-step-up-evidence.mjs',
    outputs: Object.freeze([
      'docs/security/evidence/p1/step-up-sensitive-actions.json',
    ]),
  }),
});

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function getDerivedScorecardBuilder(key) {
  const normalized = String(key || '').trim();
  const descriptor = DERIVED_SCORECARD_BUILDERS[normalized];
  if (!descriptor) throw new Error('derived_scorecard_builder_not_allowlisted');
  return { key: normalized, ...descriptor };
}

export function validateDerivedScorecardBuilderOutputs({
  root = process.cwd(),
  descriptor,
  targetSha,
  repository = CANONICAL_REPOSITORY,
} = {}) {
  const failures = [];
  const results = [];

  if (!descriptor?.script || !Array.isArray(descriptor?.outputs) || descriptor.outputs.length === 0) {
    failures.push('descriptor_invalid');
  }
  if (!FULL_SHA.test(String(targetSha || ''))) failures.push('target_sha_invalid');
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');

  for (const relativePath of descriptor?.outputs || []) {
    const absolutePath = resolve(root, relativePath);
    if (!existsSync(absolutePath)) {
      failures.push(`${relativePath}:missing`);
      results.push({ path: relativePath, status: 'MISSING', acceptedForAggregation: false });
      continue;
    }

    const document = readJson(absolutePath);
    if (!document) {
      failures.push(`${relativePath}:invalid_json`);
      results.push({ path: relativePath, status: 'INVALID', acceptedForAggregation: false });
      continue;
    }

    const documentFailures = [];
    const status = String(document?.status || '');
    const outcome = String(document?.outcome || '');

    if (document?.repository !== repository) documentFailures.push('repository_mismatch');
    if (document?.targetSha !== targetSha) documentFailures.push('target_sha_mismatch');
    if (document?.observedSha !== targetSha) documentFailures.push('observed_sha_mismatch');
    if (!String(document?.branch || '').trim()) documentFailures.push('branch_missing');
    if (!['Complete', 'Open'].includes(status)) documentFailures.push('status_invalid');
    if (status === 'Complete' && outcome !== 'passed') documentFailures.push('complete_outcome_invalid');
    if (status === 'Open' && outcome !== 'not_verified') documentFailures.push('open_outcome_invalid');
    if (document?.evidenceIntegrity?.containsSensitiveValues !== false) {
      documentFailures.push('sensitive_evidence_boundary_invalid');
    }
    if (document?.evidenceIntegrity?.exactShaBound !== true) {
      documentFailures.push('exact_sha_boundary_invalid');
    }

    for (const failure of documentFailures) failures.push(`${relativePath}:${failure}`);
    results.push({
      path: relativePath,
      status,
      outcome,
      acceptedForAggregation: documentFailures.length === 0,
      failures: documentFailures,
    });
  }

  const completeCount = results.filter(
    (result) => result.acceptedForAggregation && result.status === 'Complete',
  ).length;
  const openCount = results.filter(
    (result) => result.acceptedForAggregation && result.status === 'Open',
  ).length;

  return {
    passed: failures.length === 0 && results.length === (descriptor?.outputs?.length || 0),
    completeCount,
    openCount,
    totalCount: descriptor?.outputs?.length || 0,
    failures,
    results,
  };
}

export function derivedBuilderExitIsAcceptable({ builderExitCode, validation }) {
  if (!validation?.passed) return false;
  if (builderExitCode === 0) return validation.openCount === 0;
  if (builderExitCode === 1) return validation.openCount > 0;
  return false;
}

export function runDerivedScorecardEvidenceBuilder({
  key,
  root = process.cwd(),
  targetSha = String(process.env.TARGET_SHA || process.env.ASSESSED_SHA || '').trim().toLowerCase(),
  repository = String(process.env.GITHUB_REPOSITORY || CANONICAL_REPOSITORY).trim(),
  spawn = spawnSync,
} = {}) {
  const descriptor = getDerivedScorecardBuilder(key);
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');

  const builderPath = resolve(root, descriptor.script);
  if (!existsSync(builderPath)) throw new Error('derived_scorecard_builder_script_missing');

  const child = spawn(process.execPath, [builderPath], {
    cwd: root,
    env: { ...process.env, TARGET_SHA: targetSha },
    encoding: 'utf8',
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  if (child.error) throw new Error('derived_scorecard_builder_spawn_failed');
  if (child.signal) throw new Error('derived_scorecard_builder_terminated');
  const builderExitCode = Number.isInteger(child.status) ? child.status : null;

  const validation = validateDerivedScorecardBuilderOutputs({
    root,
    descriptor,
    targetSha,
    repository,
  });
  if (!derivedBuilderExitIsAcceptable({ builderExitCode, validation })) {
    const reason = validation.failures[0] || `builder_exit_${builderExitCode ?? 'unknown'}`;
    throw new Error(`derived_scorecard_aggregation_invalid:${reason}`);
  }

  console.log(JSON.stringify({
    mode: 'scorecard_aggregation',
    builder: descriptor.key,
    targetSha,
    builderExitCode,
    completeCount: validation.completeCount,
    openCount: validation.openCount,
    totalCount: validation.totalCount,
    truthBoundary: 'Open derived evidence is preserved for scorecard aggregation only and receives no PASS credit. Unknown builders, missing or malformed outputs, stale SHA, sensitive evidence, invalid provenance, and unexpected exits remain fatal.',
  }, null, 2));

  return { descriptor, builderExitCode, validation };
}

async function main() {
  const key = process.argv[2] || '';
  runDerivedScorecardEvidenceBuilder({ key });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Derived scorecard evidence aggregation failed: ${error instanceof Error ? error.message.split(':')[0] : 'unknown_error'}`);
    process.exit(1);
  });
}
