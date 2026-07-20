#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const output = 'docs/security/evidence/runtime/rollback-validation.json';
const requiredConfirmation = 'EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK';
const env = (name) => String(process.env[name] ?? '').trim();
const startedAt = Date.now();
const checks = {};
const failures = [];

function requireValue(name) {
  const value = env(name);
  if (!value) failures.push(`missing_${name.toLowerCase()}`);
  return value;
}

function safeUrl(value) {
  try { return new URL(value).origin; } catch { return null; }
}

async function verifyHealth(baseUrl) {
  const response = await fetch(new URL('/api/health', `${baseUrl}/`), {
    headers: { 'user-agent': 'risck-comply-recovery-proof/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  const statusOk = response.status === 200;
  const bodyOk = body !== null && typeof body === 'object' && body.status === 'ok';
  const noStore = /(?:^|,)\s*no-store(?:\s*(?:,|$))/i.test(response.headers.get('cache-control') ?? '');
  if (!statusOk || !bodyOk || !noStore) throw new Error('post_rollback_health_failed');
}

const confirmation = requireValue('RECOVERY_EXERCISE_CONFIRMATION');
const token = requireValue('VERCEL_TOKEN');
const scope = requireValue('VERCEL_ORG_ID');
const project = requireValue('VERCEL_PROJECT_ID');
const rollbackTarget = safeUrl(requireValue('LAST_KNOWN_GOOD_DEPLOYMENT_URL'));
const currentTarget = safeUrl(requireValue('PRODUCTION_URL'));
const targetSha = requireValue('LAST_KNOWN_GOOD_COMMIT_SHA');
const currentSha = requireValue('GITHUB_SHA');

checks.explicitConfirmation = confirmation === requiredConfirmation;
checks.rollbackTargetConfigured = Boolean(rollbackTarget);
checks.rollbackTargetDistinct = Boolean(rollbackTarget && currentTarget && rollbackTarget !== currentTarget);
checks.rollbackShaDistinct = /^[a-f0-9]{40}$/i.test(targetSha) && targetSha !== currentSha;
checks.protectedEnvironment = env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main';

if (!Object.values(checks).every(Boolean)) failures.push('preconditions_failed');

try {
  if (failures.length) throw new Error('rollback_preconditions_failed');
  execFileSync('npx', ['--yes', 'vercel@56.3.2', 'rollback', rollbackTarget, '--token', token, '--scope', scope, '--yes'], {
    stdio: 'pipe',
    env: { ...process.env, VERCEL_PROJECT_ID: project, VERCEL_ORG_ID: scope },
    timeout: 180_000,
  });
  checks.rollbackExecuted = true;

  execFileSync('npx', ['--yes', 'vercel@56.3.2', 'rollback', 'status', project, '--token', token, '--scope', scope, '--timeout', '120s'], {
    stdio: 'pipe',
    timeout: 150_000,
  });
  checks.rollbackStatusChecked = true;

  await verifyHealth(currentTarget);
  // Only canonical literals are persisted after fail-closed validation. No network data is serialized.
  checks.postRollbackHealth = true;
  checks.postRollbackNoStore = true;
} catch (error) {
  checks.rollbackExecuted ??= false;
  checks.rollbackStatusChecked ??= false;
  checks.postRollbackHealth ??= false;
  checks.postRollbackNoStore ??= false;
  failures.push(error instanceof Error ? error.message : 'unknown_rollback_failure');
}

const passed = failures.length === 0 && Object.values(checks).every(Boolean);
const evidence = {
  schema: 'risck-comply.rollback-validation.v3',
  evidenceItem: 'rollback-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  repository: env('GITHUB_REPOSITORY'),
  branch: env('GITHUB_REF_NAME'),
  targetSha: currentSha || null,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  checks,
  metrics: { recoveryTimeSeconds: Math.round((Date.now() - startedAt) / 1000) },
  failures: [...new Set(failures)],
  evidenceIntegrity: {
    exactShaBound: /^[a-f0-9]{40}$/i.test(currentSha),
    credentialsStored: false,
    deploymentUrlsStored: false,
    responseBodiesStored: false,
    responseHeadersStored: false,
    networkDataStored: false,
  },
  boundary: 'A protected, explicitly confirmed GitHub Actions run invoked Vercel Instant Rollback and validated the production health endpoint. Network response data is validated fail-closed but never serialized. Database rollback is out of scope.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);
