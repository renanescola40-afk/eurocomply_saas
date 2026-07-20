#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  evaluateRuntimeReleaseSha,
  sanitizeRuntimeReleaseResponse,
} from './runtime-release-sha-contract.mjs';
import { evaluateVercelDeploymentMetadata } from './protected-rollback-contract.mjs';

const OUTPUT = 'docs/security/evidence/runtime/rollback-validation.json';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const CANONICAL_PRODUCTION_HOST = 'risckcomply.com';
const VERCEL_CLI_VERSION = '56.3.2';
const FULL_SHA = /^[a-f0-9]{40}$/;
const MAX_RUNTIME_RESPONSE_BYTES = 64 * 1024;
const MAX_PROVIDER_RESPONSE_BYTES = 2 * 1024 * 1024;

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function safeUrl(value, { vercelDeployment = false, allowedHostname = null } = {}) {
  try {
    const url = new URL(value);
    const isOriginOnly = url.pathname === '/'
      && !url.username
      && !url.password
      && !url.port
      && !url.search
      && !url.hash;
    const isVercelDeployment = url.hostname.endsWith('.vercel.app')
      && url.hostname !== 'vercel.app';
    return url.protocol === 'https:'
      && isOriginOnly
      && (!vercelDeployment || isVercelDeployment)
      && (!allowedHostname || url.hostname === allowedHostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

function runVercel(args, token) {
  const result = spawnSync('npx', ['--yes', `vercel@${VERCEL_CLI_VERSION}`, ...args, '--token', token, '--yes'], {
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

async function health(baseUrl) {
  try {
    const response = await fetch(new URL('/api/health', baseUrl), {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => null);
    return {
      passed: response.status === 200
        && body?.status === 'ok'
        && /\bno-store\b/i.test(response.headers.get('cache-control') ?? ''),
      status: response.status,
      noStore: /\bno-store\b/i.test(response.headers.get('cache-control') ?? ''),
    };
  } catch {
    return { passed: false, status: 0, noStore: false };
  }
}

async function readBoundedJsonResponse(response, maxBytes = MAX_RUNTIME_RESPONSE_BYTES) {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength) {
    const parsedLength = Number.parseInt(declaredLength, 10);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new Error('runtime_release_response_too_large');
    }
  }

  if (!response.body) throw new Error('runtime_release_response_missing_body');
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('runtime_release_response_too_large').catch(() => undefined);
        throw new Error('runtime_release_response_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function releaseIdentity(baseUrl, expectedSha, token) {
  try {
    const response = await fetch(new URL('/api/ready/release', baseUrl), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'risck-comply-protected-rollback/2.0',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const runtime = sanitizeRuntimeReleaseResponse(await readBoundedJsonResponse(response));
    const evaluation = evaluateRuntimeReleaseSha({
      expectedCommitSha: expectedSha,
      expectedBuildSha: expectedSha,
      observedCommitSha: runtime.observedCommitSha,
      endpointStatus: response.status,
      cacheControl: response.headers.get('cache-control') ?? '',
    });
    return {
      passed: evaluation.passed
        && runtime.statusOk
        && runtime.available
        && ['vercel', 'build-env'].includes(runtime.provenance),
      endpointStatus: response.status,
    };
  } catch {
    return { passed: false, endpointStatus: 0 };
  }
}

async function deploymentProof(baseUrl, expectedSha, token) {
  const [healthResult, identityResult] = await Promise.all([
    health(baseUrl),
    releaseIdentity(baseUrl, expectedSha, token),
  ]);
  return { passed: healthResult.passed && identityResult.passed };
}

async function inspectVercelDeployment(deploymentUrl, expectedSha, token, ownerId, projectId) {
  try {
    const deployment = new URL(deploymentUrl);
    const endpoint = new URL(`/v13/deployments/${encodeURIComponent(deployment.hostname)}`, 'https://api.vercel.com');
    endpoint.searchParams.set('withGitRepoInfo', 'true');
    endpoint.searchParams.set('teamId', ownerId);
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'risck-comply-protected-rollback/2.0',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status !== 200) return { passed: false };
    return evaluateVercelDeploymentMetadata({
      metadata: await readBoundedJsonResponse(response, MAX_PROVIDER_RESPONSE_BYTES),
      expectedHostname: deployment.hostname,
      expectedProjectId: projectId,
      expectedOwnerId: ownerId,
      expectedSha,
    });
  } catch {
    return { passed: false };
  }
}

async function verifyCurrentMain(currentSha, githubToken) {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/commits/main`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'risck-comply-protected-rollback/2.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const body = response.status === 200 ? await readBoundedJsonResponse(response) : null;
    return response.status === 200 && String(body?.sha ?? '').trim().toLowerCase() === currentSha;
  } catch {
    return false;
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
      exactShaBound: FULL_SHA.test(currentSha)
        && currentSha === env('GITHUB_SHA').toLowerCase()
        && currentSha === env('TARGET_SHA').toLowerCase(),
      currentMainVerified: env('CURRENT_MAIN_VERIFIED') === 'true',
      rollbackTargetCommitVerified: env('ROLLBACK_TARGET_COMMIT_VERIFIED') === 'true',
      manualApprovalRequired: true,
    },
    checks: {
      rollbackTargetConfigured: false,
      distinctDeployment: false,
      explicitConfirmation: false,
      rollbackTargetVerified: false,
      rollbackTargetProviderVerified: false,
      currentDeploymentVerified: false,
      currentDeploymentProviderVerified: false,
      currentProductionVerified: false,
      currentMainFresh: false,
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
  const targetDeployment = safeUrl(env('ROLLBACK_TARGET_DEPLOYMENT_URL'), { vercelDeployment: true });
  const currentDeployment = safeUrl(env('CURRENT_PRODUCTION_DEPLOYMENT_URL'), { vercelDeployment: true });
  const productionUrl = safeUrl(env('PRODUCTION_URL'), { allowedHostname: CANONICAL_PRODUCTION_HOST });
  const token = env('VERCEL_TOKEN');
  const ownerId = env('VERCEL_ORG_ID');
  const projectId = env('VERCEL_PROJECT_ID');
  const githubToken = env('GITHUB_TOKEN') || env('GH_TOKEN');
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
    ownerId: Boolean(ownerId),
    projectId: Boolean(projectId),
    githubToken: Boolean(githubToken),
    healthToken: Boolean(healthToken),
    requestedShaMatchesCheckout: env('TARGET_SHA').toLowerCase() === currentSha,
    githubActions: env('GITHUB_ACTIONS') === 'true',
    repository: env('GITHUB_REPOSITORY') === REPOSITORY,
    branch: env('GITHUB_REF_NAME') === 'main',
    currentMainVerified: env('CURRENT_MAIN_VERIFIED') === 'true',
    rollbackTargetCommitVerified: env('ROLLBACK_TARGET_COMMIT_VERIFIED') === 'true',
  };

  evidence.checks.rollbackTargetConfigured = Object.values(required).every(Boolean);
  evidence.checks.distinctDeployment = targetSha !== currentSha
    && targetDeployment?.hostname !== currentDeployment?.hostname;
  evidence.checks.explicitConfirmation = confirmation === `ROLLBACK ${currentSha} TO ${targetSha}`;

  if (!evidence.checks.rollbackTargetConfigured) evidence.failures.push('rollback_configuration_incomplete');
  if (!evidence.checks.distinctDeployment) evidence.failures.push('rollback_target_not_distinct');
  if (!evidence.checks.explicitConfirmation) evidence.failures.push('rollback_confirmation_invalid');

  if (evidence.failures.length === 0) {
    const [
      rollbackTargetHealth,
      rollbackTargetProvider,
      currentDeploymentHealth,
      currentDeploymentProvider,
      currentProductionHealth,
    ] = await Promise.all([
      deploymentProof(targetDeployment.href, targetSha, healthToken),
      inspectVercelDeployment(targetDeployment.href, targetSha, token, ownerId, projectId),
      deploymentProof(currentDeployment.href, currentSha, healthToken),
      inspectVercelDeployment(currentDeployment.href, currentSha, token, ownerId, projectId),
      deploymentProof(productionUrl.href, currentSha, healthToken),
    ]);

    evidence.checks.rollbackTargetVerified = rollbackTargetHealth.passed;
    evidence.checks.rollbackTargetProviderVerified = rollbackTargetProvider.passed;
    evidence.checks.currentDeploymentVerified = currentDeploymentHealth.passed;
    evidence.checks.currentDeploymentProviderVerified = currentDeploymentProvider.passed;
    evidence.checks.currentProductionVerified = currentProductionHealth.passed;

    if (!rollbackTargetHealth.passed) evidence.failures.push('rollback_target_preflight_failed');
    if (!rollbackTargetProvider.passed) evidence.failures.push('rollback_target_provider_preflight_failed');
    if (!currentDeploymentHealth.passed) evidence.failures.push('current_deployment_preflight_failed');
    if (!currentDeploymentProvider.passed) evidence.failures.push('current_deployment_provider_preflight_failed');
    if (!currentProductionHealth.passed) evidence.failures.push('current_production_preflight_failed');
  }

  if (evidence.failures.length === 0) {
    evidence.checks.currentMainFresh = await verifyCurrentMain(currentSha, githubToken);
    if (!evidence.checks.currentMainFresh) evidence.failures.push('current_main_changed_before_rollback');
  }

  let rollbackAttempted = false;
  let rolledBack = false;
  try {
    if (evidence.failures.length === 0) {
      rollbackAttempted = true;
      const rollback = runVercel(['rollback', targetDeployment.href], token);
      evidence.checks.rollbackExecuted = rollback.ok;
      if (!rollback.ok) evidence.failures.push('vercel_rollback_failed');
      rolledBack = rollback.ok;

      if (rolledBack) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const rollbackHealth = await deploymentProof(productionUrl.href, targetSha, healthToken);
        evidence.checks.postRollbackHealth = rollbackHealth.passed;
        if (!rollbackHealth.passed) evidence.failures.push('post_rollback_health_failed');
      }
    }
  } finally {
    if (rollbackAttempted && currentDeployment) {
      const restore = runVercel(['promote', currentDeployment.href], token);
      evidence.checks.currentDeploymentRestored = restore.ok;
      if (!restore.ok) evidence.failures.push('current_deployment_restore_failed');

      if (restore.ok && productionUrl) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const restoreHealth = await deploymentProof(productionUrl.href, currentSha, healthToken);
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
