#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const FULL_SHA = /^[0-9a-f]{40}$/;
const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const POSTGRES_IDENTITY_OVERRIDE_PARAMS = new Set([
  'host',
  'hostaddr',
  'port',
  'dbname',
  'database',
  'service',
  'servicefile',
]);
const mode = String(process.argv[2] || '').trim();
const env = (name) => String(process.env[name] || '').trim();

const outputByMode = {
  'final-technical': 'docs/security/evidence/runtime/final-technical-controls-preflight.json',
  recovery: 'docs/security/evidence/runtime/recovery-resilience-preflight.json',
};

if (!Object.hasOwn(outputByMode, mode)) {
  console.error('Usage: node scripts/security/preflight-protected-proof.mjs <final-technical|recovery>');
  process.exit(2);
}

const output = env('PROTECTED_PROOF_PREFLIGHT_OUTPUT') || outputByMode[mode];
const generatedAt = new Date().toISOString();
const failures = [];
const missingConfiguration = [];
const checks = {};

function requireConfigured(name) {
  const present = Boolean(env(name));
  checks[`configured:${name}`] = present;
  if (!present) {
    missingConfiguration.push(name);
    failures.push(`missing_${name.toLowerCase()}`);
  }
  return present;
}

function requireExact(name, expected, failureCode) {
  const passed = env(name) === expected;
  checks[`exact:${name}`] = passed;
  if (!passed) failures.push(failureCode);
  return passed;
}

function validateShaBinding(targetName) {
  const targetSha = env(targetName).toLowerCase();
  const githubSha = env('GITHUB_SHA').toLowerCase();
  const targetValid = FULL_SHA.test(targetSha);
  const githubShaValid = FULL_SHA.test(githubSha);
  checks.targetShaValid = targetValid;
  checks.githubShaValid = githubShaValid;
  checks.githubShaMatchesTarget = targetValid && githubShaValid && targetSha === githubSha;
  if (!targetValid) failures.push('target_sha_invalid');
  if (!githubShaValid) failures.push('github_sha_invalid');
  if (targetValid && githubShaValid && targetSha !== githubSha) failures.push('github_sha_target_mismatch');
  return targetValid ? targetSha : null;
}

function canonicalPostgresDatabaseIdentity(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) return null;
    if (!parsed.hostname) return null;

    for (const key of parsed.searchParams.keys()) {
      if (POSTGRES_IDENTITY_OVERRIDE_PARAMS.has(String(key).toLowerCase())) return null;
    }

    const host = parsed.hostname.toLowerCase();
    if (host.includes(',')) return null;
    const port = parsed.port || '5432';
    if (!/^\d{1,5}$/.test(port)) return null;

    let database;
    try {
      database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    } catch {
      return null;
    }
    if (!database || database.includes('/') || database.includes('\0')) return null;

    return `${host}:${port}/${database}`;
  } catch {
    return null;
  }
}

let targetSha = null;
let exercise = null;
let databaseIsolationVerified = null;

if (mode === 'final-technical') {
  targetSha = validateShaBinding('ENTERPRISE_EXPECTED_SHA');
  requireExact('FINAL_TECHNICAL_CONFIRMATION', 'EXECUTE_FINAL_TECHNICAL_PROOF', 'final_technical_confirmation_invalid');
  requireConfigured('NEXT_PUBLIC_SUPABASE_URL');
  requireConfigured('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  requireConfigured('SUPABASE_SERVICE_ROLE_KEY');
  requireConfigured('RECOVERY_ISOLATED_DATABASE_URL');
} else {
  targetSha = validateShaBinding('TARGET_SHA');
  exercise = env('RECOVERY_REQUIRED_EXERCISE');
  const exerciseValid = ['full', 'backup-restore', 'production-rollback'].includes(exercise);
  checks.exerciseValid = exerciseValid;
  if (!exerciseValid) failures.push('recovery_exercise_invalid');

  const backupRestoreRequired = exercise === 'full' || exercise === 'backup-restore';
  const rollbackRequired = exercise === 'full' || exercise === 'production-rollback';
  checks.backupRestorePrerequisitesRequired = backupRestoreRequired;
  checks.rollbackPrerequisitesRequired = rollbackRequired;

  if (backupRestoreRequired) {
    const sourcePresent = requireConfigured('RECOVERY_SOURCE_DATABASE_URL');
    const isolatedPresent = requireConfigured('RECOVERY_ISOLATED_DATABASE_URL');
    if (sourcePresent && isolatedPresent) {
      const sourceIdentity = canonicalPostgresDatabaseIdentity(env('RECOVERY_SOURCE_DATABASE_URL'));
      const isolatedIdentity = canonicalPostgresDatabaseIdentity(env('RECOVERY_ISOLATED_DATABASE_URL'));
      const identitiesVerifiable = Boolean(sourceIdentity && isolatedIdentity);
      checks.recoveryDatabaseIdentityCanonicalized = identitiesVerifiable;

      if (!identitiesVerifiable) {
        databaseIsolationVerified = false;
        checks.recoveryDatabaseIsolationVerified = false;
        failures.push('recovery_database_identity_unverifiable');
      } else {
        databaseIsolationVerified = sourceIdentity !== isolatedIdentity;
        checks.recoveryDatabaseIsolationVerified = databaseIsolationVerified;
        if (!databaseIsolationVerified) failures.push('recovery_source_matches_isolated_database');
      }
    } else {
      checks.recoveryDatabaseIdentityCanonicalized = false;
      checks.recoveryDatabaseIsolationVerified = false;
      databaseIsolationVerified = false;
    }
  }

  if (rollbackRequired) {
    requireExact('RECOVERY_EXERCISE_CONFIRMATION', 'EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK', 'recovery_rollback_confirmation_invalid');
    requireConfigured('VERCEL_TOKEN');
    requireConfigured('VERCEL_ORG_ID');
    requireConfigured('VERCEL_PROJECT_ID');
    requireConfigured('LAST_KNOWN_GOOD_DEPLOYMENT_URL');
    requireConfigured('LAST_KNOWN_GOOD_COMMIT_SHA');
    requireConfigured('PRODUCTION_URL');
  }
}

checks.preflightPerformedWithoutRuntimeMutation = true;
const uniqueFailures = [...new Set(failures)];
const ready = uniqueFailures.length === 0;

const evidence = {
  schema: 'risck-comply.protected-proof-preflight.v1',
  evidenceItem: 'protected-proof-preflight',
  mode,
  exercise,
  status: ready ? 'Complete' : 'Open',
  outcome: ready ? 'passed' : 'blocked',
  generatedAt,
  repository: env('GITHUB_REPOSITORY') || null,
  branch: env('GITHUB_REF_NAME') || null,
  targetSha,
  workflowRunId: /^\d+$/.test(env('GITHUB_RUN_ID')) ? env('GITHUB_RUN_ID') : null,
  ready,
  checks,
  missingConfiguration: [...new Set(missingConfiguration)],
  databaseIsolationVerified,
  failures: uniqueFailures,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    secretValuesStored: false,
    credentialsStored: false,
    rawUrlsStored: false,
    databaseUrlsStored: false,
    databaseIdentitiesStored: false,
    confirmationValuesStored: false,
    providerResponsesStored: false,
    runtimeMutationPerformed: false,
  },
  evidenceBoundary: 'Preflight records only configuration presence, exact-SHA/confirmation booleans, exercise selection, whether database identities were canonicalizable, and whether canonical source/isolated identities differ. It never stores secret values, credentials, database URLs, canonical database identities, provider URLs, confirmations or provider responses and performs no runtime mutation.',
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Protected proof preflight: ${mode} ${evidence.status}/${evidence.outcome}`);
if (!ready) {
  for (const failure of uniqueFailures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
