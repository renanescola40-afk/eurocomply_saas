#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUTPUT = 'docs/security/evidence/runtime/rollback-validation.json';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const VERSION = /^\d+\.\d+\.\d+$/;

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function runVercel(args, token, version) {
  const result = spawnSync('npx', ['--yes', `vercel@${version}`, ...args, '--token', token, '--yes'], {
    encoding: 'utf8',
    env: { ...process.env, VERCEL_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    ok: !result.error && result.status === 0,
    exitCode: result.status ?? null,
    signal: result.signal ?? null,
  };
}

async function health(baseUrl, expectedSha, token) {
  try {
    const response = await fetch(new URL('/api/health', baseUrl), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => null);
    const observedSha = String(body?.commitSha ?? body?.buildSha ?? response.headers.get('x-build-sha') ?? '').trim().toLowerCase();
    return {
      passed: response.status === 200
        && body?.status === 'ok'
        && /\bno-store\b/i.test(response.headers.get('cache-control') ?? '')
        && (!expectedSha || observedSha === expectedSha),
      status: response.status,
      noStore: /\bno-store\b/i.test(response.headers.get('cache-control') ?? ''),
      observedShaMatches: expectedSha ? observedSha === expectedSha : false,
    };
  } catch {
    return { passed: false, status: 0, noStore: false, observedShaMatches: false };
  }
}

function evidenceBase({ targetSha, currentSha, runId, generatedAt }) {
  return {
    schema: 'risck-comply.rollback-runtime-evidence.v1',
    evidenceItem: 'rollback-validation',
    status: 'Open',
    outcome: 'failed',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected recovery automation',
    repository: REPOSITORY,
    branch: 'main',
    targetSha,
    checkedOutSha: currentSha,
    environment: 'production',
    provenance: {
      githubActions: env('GITHUB_ACTIONS') === 'true',
      runId,
      exactShaBound: FULL_SHA.test(currentSha) && currentSha === env('GITHUB_SHA').toLowerCase(),
      manualApprovalRequired: true,
    },
    checks: {
      rollbackTargetConfigured: false,
      distinctDeployment: false,
      explicitConfirmation: false,
      rollbackExecuted: false,
      postRollbackHealth: false,
      currentDeploymentRestored: false,
      postRestoreHealth: false,
    },
    failures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawTokenStored: false,
      rawDeploymentUrlStored: false,
      rawProviderResponseStored: false,
      exactShaBound: false,
    },
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const currentSha = env('GITHUB_SHA').toLowerCase();
  const targetSha = env('ROLLBACK_TARGET_SHA').toLowerCase();
  const targetDeployment = safeUrl(env('ROLLBACK_TARGET_DEPLOYMENT_URL'));
  const currentDeployment = safeUrl(env('CURRENT_PRODUCTION_DEPLOYMENT_URL'));
  const productionUrl = safeUrl(env('PRODUCTION_URL'));
  const token = env('VERCEL_TOKEN');
  const cliVersion = env('VERCEL_CLI_VERSION');
  const confirmation = env('ROLLBACK_CONFIRMATION');
  const healthToken = env('HEALTHCHECK_TOKEN');
  const runId = /^\d+$/.test(env('GITHUB_RUN_ID')) ? env('GITHUB_RUN_ID') : null;
  const evidence = evidenceBase({ targetSha, currentSha, runId, generatedAt });

  const required = {
    currentSha: FULL_SHA.test(currentSha),
    targetSha: FULL_SHA.test(targetSha),
    targetDeployment: Boolean(targetDeployment),
    currentDeployment: Boolean(currentDeployment),
    productionUrl: Boolean(productionUrl),
    token: Boolean(token),
    cliVersion: VERSION.test(cliVersion),
    githubActions: env('GITHUB_ACTIONS') === 'true',
    repository: env('GITHUB_REPOSITORY') === REPOSITORY,
    branch: env('GITHUB_REF_NAME') === 'main',
  };

  evidence.checks.rollbackTargetConfigured = Object.values(required).every(Boolean);
  evidence.checks.distinctDeployment = targetSha !== currentSha
    && targetDeployment?.hostname !== currentDeployment?.hostname;
  evidence.checks.explicitConfirmation = confirmation === `ROLLBACK ${currentSha} TO ${targetSha}`;

  if (!evidence.checks.rollbackTargetConfigured) evidence.failures.push('rollback_configuration_incomplete');
  if (!evidence.checks.distinctDeployment) evidence.failures.push('rollback_target_not_distinct');
  if (!evidence.checks.explicitConfirmation) evidence.failures.push('rollback_confirmation_invalid');

  let rolledBack = false;
  try {
    if (evidence.failures.length === 0) {
      const rollback = runVercel(['rollback', targetDeployment.href], token, cliVersion);
      evidence.checks.rollbackExecuted = rollback.ok;
      if (!rollback.ok) evidence.failures.push('vercel_rollback_failed');
      rolledBack = rollback.ok;

      if (rolledBack) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const rollbackHealth = await health(productionUrl.href, targetSha, healthToken);
        evidence.checks.postRollbackHealth = rollbackHealth.passed;
        if (!rollbackHealth.passed) evidence.failures.push('post_rollback_health_failed');
      }
    }
  } finally {
    if (rolledBack && currentDeployment) {
      const restore = runVercel(['promote', currentDeployment.href], token, cliVersion);
      evidence.checks.currentDeploymentRestored = restore.ok;
      if (!restore.ok) evidence.failures.push('current_deployment_restore_failed');

      if (restore.ok && productionUrl) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const restoreHealth = await health(productionUrl.href, currentSha, healthToken);
        evidence.checks.postRestoreHealth = restoreHealth.passed;
        if (!restoreHealth.passed) evidence.failures.push('post_restore_health_failed');
      }
    }
  }

  const passed = Object.values(evidence.checks).every(Boolean) && evidence.failures.length === 0;
  evidence.status = passed ? 'Complete' : 'Open';
  evidence.outcome = passed ? 'passed' : 'failed';
  evidence.summary = passed
    ? 'Protected production rollback validation moved traffic to a distinct known-good deployment, verified health and exact target SHA, then restored and revalidated the current deployment.'
    : 'Protected production rollback validation did not complete every rollback, health and restoration assertion; recovery controls remain NOT_VERIFIED.';
  evidence.productionGate = passed ? 'eligible for downstream enterprise gates' : 'blocked';
  evidence.evidenceIntegrity.exactShaBound = evidence.provenance.exactShaBound;

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Rollback runtime evidence: ${evidence.status}/${evidence.outcome}`);
  if (!passed) process.exitCode = 1;
}

main().catch(() => {
  console.error('Rollback runtime validation failed closed.');
  process.exit(1);
});
