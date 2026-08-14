#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRepositoryDerivedCompatibilityView } from './run-derived-scorecard-evidence-builder.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const DEFAULT_GITHUB_CHECKS = 'artifacts/enterprise-readiness/github-checks-evidence.json';
const REPOSITORY_COMPATIBILITY_CHECKS = 'artifacts/enterprise-readiness/github-checks-repository-compatibility.json';

export const REPOSITORY_CONTROL_OUTPUTS = Object.freeze([
  'docs/security/evidence/runtime/security-headers-validation.json',
  'docs/security/evidence/runtime/no-store-validation.json',
  'docs/security/evidence/runtime/origin-guard-validation.json',
  'docs/security/evidence/runtime/authorization-bola-validation.json',
  'docs/security/evidence/runtime/supabase-admin-boundary-validation.json',
  'docs/security/evidence/runtime/export-tenant-isolation-validation.json',
  'docs/security/evidence/runtime/centralized-logging-validation.json',
  'docs/security/evidence/runtime/request-id-validation.json',
  'docs/security/evidence/runtime/internal-jobs-validation.json',
  'docs/security/evidence/release/vulnerability-disclosure-validation.json',
]);

function readJson(path) {
  try {
    return { document: JSON.parse(readFileSync(path, 'utf8')), error: null };
  } catch (error) {
    return {
      document: null,
      error: error instanceof Error ? error.message : 'invalid_json',
    };
  }
}

function containsSensitiveValues(document) {
  return document?.evidenceIntegrity?.containsSensitiveValues === true
    || document?.containsSensitiveValues === true
    || document?.containsSecrets === true
    || document?.secretsRedacted === false;
}

export function validateRepositoryControlAggregationOutputs({
  root = process.cwd(),
  targetSha,
  repository = CANONICAL_REPOSITORY,
} = {}) {
  const failures = [];
  const results = [];

  if (!FULL_SHA.test(String(targetSha || ''))) failures.push('target_sha_invalid');
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository_not_canonical');

  for (const relativePath of REPOSITORY_CONTROL_OUTPUTS) {
    const absolutePath = resolve(root, relativePath);
    if (!existsSync(absolutePath)) {
      failures.push(`${relativePath}:missing`);
      results.push({ path: relativePath, status: 'MISSING' });
      continue;
    }

    const parsed = readJson(absolutePath);
    if (!parsed.document) {
      failures.push(`${relativePath}:invalid_json`);
      results.push({ path: relativePath, status: 'INVALID' });
      continue;
    }

    const document = parsed.document;
    const status = String(document?.status || '');
    const outcome = String(document?.outcome || '');
    const documentFailures = [];

    if (document?.repository !== repository) documentFailures.push('repository_mismatch');
    if (document?.targetSha !== targetSha) documentFailures.push('target_sha_mismatch');
    if (document?.observedSha !== targetSha) documentFailures.push('observed_sha_mismatch');
    if (!['Complete', 'Open'].includes(status)) documentFailures.push('status_invalid');
    if (status === 'Complete' && outcome !== 'passed') documentFailures.push('complete_outcome_invalid');
    if (status === 'Open' && outcome !== 'not_verified') documentFailures.push('open_outcome_invalid');
    if (containsSensitiveValues(document)) documentFailures.push('sensitive_evidence_rejected');
    if (document?.evidenceIntegrity?.exactShaBound !== true) documentFailures.push('exact_sha_boundary_invalid');

    for (const failure of documentFailures) failures.push(`${relativePath}:${failure}`);
    results.push({
      path: relativePath,
      status,
      outcome,
      acceptedForAggregation: documentFailures.length === 0,
      failures: documentFailures,
    });
  }

  const completeCount = results.filter((result) => result.status === 'Complete' && result.acceptedForAggregation).length;
  const openCount = results.filter((result) => result.status === 'Open' && result.acceptedForAggregation).length;

  return {
    passed: failures.length === 0 && results.length === REPOSITORY_CONTROL_OUTPUTS.length,
    completeCount,
    openCount,
    totalCount: REPOSITORY_CONTROL_OUTPUTS.length,
    failures,
    results,
  };
}

export function repositoryControlBuilderExitIsAcceptable({ builderExitCode, validation }) {
  if (!validation?.passed) return false;
  if (builderExitCode === 0) return validation.openCount === 0;
  if (builderExitCode === 1) return validation.openCount > 0;
  return false;
}

function spawnBuilder({ spawn, builderPath, root, targetSha, checksPath }) {
  return spawn(process.execPath, [builderPath], {
    cwd: root,
    env: {
      ...process.env,
      TARGET_SHA: targetSha,
      ...(checksPath ? { GITHUB_CHECKS_EVIDENCE_PATH: checksPath } : {}),
    },
    encoding: 'utf8',
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

export function runRepositoryControlEvidenceForScorecard({
  root = process.cwd(),
  targetSha = String(process.env.TARGET_SHA || process.env.ASSESSED_SHA || '').trim().toLowerCase(),
  repository = String(process.env.GITHUB_REPOSITORY || CANONICAL_REPOSITORY).trim(),
  spawn = spawnSync,
} = {}) {
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');

  const builderPath = resolve(root, 'scripts/enterprise/build-repository-control-evidence.mjs');
  let child = spawnBuilder({ spawn, builderPath, root, targetSha });

  if (child.error) throw new Error('repository_control_builder_spawn_failed');
  if (child.signal) throw new Error('repository_control_builder_terminated');

  let builderExitCode = Number.isInteger(child.status) ? child.status : null;
  let validation = validateRepositoryControlAggregationOutputs({ root, targetSha, repository });
  let repositoryCompatibilityApplied = false;

  if (builderExitCode === 1 && validation.passed && validation.openCount > 0) {
    const checksRelativePath = process.env.GITHUB_CHECKS_EVIDENCE_PATH || DEFAULT_GITHUB_CHECKS;
    const checksAbsolutePath = resolve(root, checksRelativePath);
    const githubChecks = existsSync(checksAbsolutePath)
      ? JSON.parse(readFileSync(checksAbsolutePath, 'utf8'))
      : null;
    const compatibility = buildRepositoryDerivedCompatibilityView({ githubChecks, targetSha });

    if (compatibility.enabled) {
      const compatibilityAbsolutePath = resolve(root, REPOSITORY_COMPATIBILITY_CHECKS);
      writeFileSync(compatibilityAbsolutePath, `${JSON.stringify(compatibility.document, null, 2)}\n`);

      child = spawnBuilder({
        spawn,
        builderPath,
        root,
        targetSha,
        checksPath: REPOSITORY_COMPATIBILITY_CHECKS,
      });
      if (child.error) throw new Error('repository_control_builder_compatibility_spawn_failed');
      if (child.signal) throw new Error('repository_control_builder_compatibility_terminated');

      builderExitCode = Number.isInteger(child.status) ? child.status : null;
      validation = validateRepositoryControlAggregationOutputs({ root, targetSha, repository });
      repositoryCompatibilityApplied = true;
    }
  }

  if (!repositoryControlBuilderExitIsAcceptable({ builderExitCode, validation })) {
    const reason = validation.failures[0] || `builder_exit_${builderExitCode ?? 'unknown'}`;
    throw new Error(`repository_control_aggregation_invalid:${reason}`);
  }

  console.log(JSON.stringify({
    mode: 'scorecard_aggregation',
    targetSha,
    builderExitCode,
    repositoryCompatibilityApplied,
    completeCount: validation.completeCount,
    openCount: validation.openCount,
    totalCount: validation.totalCount,
    truthBoundary: 'Repository-control evidence may use the canonical exact-SHA CI/security compatibility view only after the repository evidence boundary passes. This never changes the real requiredChecks or Enterprise Production Gate signals and never grants production/runtime release credit. Open evidence is retained but never promoted to PASS; missing, malformed, stale-SHA, sensitive, or provenance-invalid evidence remains fatal.',
  }, null, 2));

  return { builderExitCode, repositoryCompatibilityApplied, validation };
}

async function main() {
  runRepositoryControlEvidenceForScorecard();
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Repository control scorecard aggregation failed: ${error instanceof Error ? error.message.split(':')[0] : 'unknown_error'}`);
    process.exit(1);
  });
}
