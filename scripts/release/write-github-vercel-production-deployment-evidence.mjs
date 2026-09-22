#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DEFAULT_OUTPUT = 'release-validation/production-deployment.json';
const DEFAULT_API_URL = 'https://api.github.com';
const DEFAULT_ATTEMPTS = 24;
const DEFAULT_POLL_MS = 10_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const EXPECTED_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const EXPECTED_REF = 'main';
const EXPECTED_ENVIRONMENT = 'production';
const EXPECTED_VERCEL_ACTOR = 'vercel[bot]';
const EXPECTED_VERCEL_HOST_PREFIX = 'eurocomply-saas-';
const EXPECTED_CANONICAL_PRODUCTION_URL = 'https://www.risckcomply.com';

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeEnvironment(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isExpectedVercelHost(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && url.port === ''
      && url.hostname.endsWith('.vercel.app')
      && url.hostname.startsWith(EXPECTED_VERCEL_HOST_PREFIX);
  } catch {
    return false;
  }
}

function safeVercelHost(value) {
  if (!isExpectedVercelHost(value)) return null;
  return new URL(value).hostname;
}

async function readBoundedJson(response, maxBytes = MAX_JSON_BYTES) {
  if (!response?.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('response_too_large').catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

async function githubJson({ url, token, fetchImpl }) {
  let response;
  try {
    response = await fetchImpl(url, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'risck-comply-production-deployment-proof',
      },
    });
  } catch {
    return { ok: false, status: 0, body: null };
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return { ok: false, status: response.status, body: null };
  }

  return { ok: true, status: response.status, body: await readBoundedJson(response) };
}

async function currentMainMatches({ repository, targetSha, token, fetchImpl, apiUrl }) {
  const response = await githubJson({
    url: `${apiUrl}/repos/${repository}/commits/main`,
    token,
    fetchImpl,
  });
  return response.ok && String(response.body?.sha ?? '') === targetSha;
}

function deploymentMatches(deployment, targetSha) {
  return Number.isInteger(deployment?.id)
    && String(deployment?.sha ?? '') === targetSha
    && String(deployment?.ref ?? '') === EXPECTED_REF
    && String(deployment?.task ?? '') === 'deploy'
    && normalizeEnvironment(deployment?.environment) === EXPECTED_ENVIRONMENT;
}

function successfulVercelDeploymentStatus(status) {
  const target = status?.environment_url || status?.target_url;
  return Number.isInteger(status?.id)
    && String(status?.state ?? '').toLowerCase() === 'success'
    && String(status?.creator?.login ?? '').toLowerCase() === EXPECTED_VERCEL_ACTOR
    && normalizeEnvironment(status?.environment) === EXPECTED_ENVIRONMENT
    && isExpectedVercelHost(target);
}

export async function findExactShaVercelProductionDeployment({
  repository,
  targetSha,
  token,
  fetchImpl = globalThis.fetch,
  apiUrl = DEFAULT_API_URL,
}) {
  const deploymentsResponse = await githubJson({
    url: `${apiUrl}/repos/${repository}/deployments?sha=${encodeURIComponent(targetSha)}&per_page=100`,
    token,
    fetchImpl,
  });
  if (!deploymentsResponse.ok || !Array.isArray(deploymentsResponse.body)) return null;

  const deployments = deploymentsResponse.body
    .filter((deployment) => deploymentMatches(deployment, targetSha))
    .sort((a, b) => String(b?.created_at ?? '').localeCompare(String(a?.created_at ?? '')));

  for (const deployment of deployments) {
    const statusesResponse = await githubJson({
      url: `${apiUrl}/repos/${repository}/deployments/${deployment.id}/statuses?per_page=100`,
      token,
      fetchImpl,
    });
    if (!statusesResponse.ok || !Array.isArray(statusesResponse.body)) continue;

    const status = statusesResponse.body.find(successfulVercelDeploymentStatus);
    if (!status) continue;

    const publicUrl = status.environment_url || status.target_url;
    return {
      source: 'github_deployment_status',
      deploymentId: deployment.id,
      deploymentStatusId: status.id,
      providerDeploymentId: null,
      deploymentCreatedAt: deployment.created_at ?? null,
      deploymentUpdatedAt: deployment.updated_at ?? null,
      statusCreatedAt: status.created_at ?? null,
      statusUpdatedAt: status.updated_at ?? null,
      targetHost: safeVercelHost(publicUrl),
      publicUrl,
    };
  }

  return null;
}

export async function probeExactDeploymentHealth({
  publicUrl,
  protectionBypassSecret = '',
  healthcheckToken = '',
  fetchImpl = globalThis.fetch,
}) {
  let healthUrl;
  try {
    healthUrl = new URL('/api/health', publicUrl);
  } catch {
    return {
      passed: false,
      status: 0,
      bodyStatus: null,
      noStore: false,
      protectionBypassUsed: false,
      blockedByVercelProtection: false,
    };
  }

  const bypassSecret = String(protectionBypassSecret ?? '').trim();
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'risck-comply-production-response-proof/1.0',
  };
  if (bypassSecret) headers['x-vercel-protection-bypass'] = bypassSecret;

  let response;
  try {
    response = await fetchImpl(healthUrl, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers,
    });
  } catch {
    return {
      passed: false,
      status: 0,
      bodyStatus: null,
      noStore: false,
      protectionBypassUsed: Boolean(bypassSecret),
      blockedByVercelProtection: false,
    };
  }

  const body = response.ok ? await readBoundedJson(response, 64 * 1024) : null;
  if (!response.ok) await response.body?.cancel().catch(() => undefined);
  const noStore = /\bno-store\b/i.test(String(response.headers.get('cache-control') ?? ''));
  const bodyStatus = String(body?.status ?? '');
  const location = String(response.headers.get('location') ?? '');
  let blockedByVercelProtection = false;
  if (response.status === 302 && location) {
    try {
      const redirect = new URL(location);
      blockedByVercelProtection = redirect.protocol === 'https:'
        && redirect.hostname === 'vercel.com'
        && redirect.pathname === '/sso-api';
    } catch {
      blockedByVercelProtection = false;
    }
  }
  return {
    passed: response.status === 200 && bodyStatus === 'ok' && noStore,
    status: response.status,
    bodyStatus: bodyStatus || null,
    noStore,
    protectionBypassUsed: Boolean(bypassSecret),
    blockedByVercelProtection,
  };
}

export async function probeCanonicalReleaseHealth({
  publicUrl,
  targetSha,
  healthcheckToken,
  fetchImpl = globalThis.fetch,
}) {
  const token = String(healthcheckToken ?? '').trim();
  if (!token || !FULL_SHA.test(String(targetSha ?? '').toLowerCase())) {
    return {
      passed: false,
      path: '/api/ready/release',
      status: 0,
      bodyStatus: null,
      noStore: false,
      releaseShaMatched: false,
      canonicalFallbackUsed: true,
    };
  }

  let releaseUrl;
  try {
    releaseUrl = new URL('/api/ready/release', publicUrl);
  } catch {
    return {
      passed: false,
      path: '/api/ready/release',
      status: 0,
      bodyStatus: null,
      noStore: false,
      releaseShaMatched: false,
      canonicalFallbackUsed: true,
    };
  }

  let response;
  try {
    response = await fetchImpl(releaseUrl, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'risck-comply-production-release-proof/1.0',
      },
    });
  } catch {
    return {
      passed: false,
      path: '/api/ready/release',
      status: 0,
      bodyStatus: null,
      noStore: false,
      releaseShaMatched: false,
      canonicalFallbackUsed: true,
    };
  }

  const body = response.ok ? await readBoundedJson(response, 64 * 1024) : null;
  if (!response.ok) await response.body?.cancel().catch(() => undefined);
  const noStore = /\bno-store\b/i.test(String(response.headers.get('cache-control') ?? ''));
  const bodyStatus = String(body?.status ?? '');
  const runtimeSha = String(body?.release?.commitSha ?? '').trim().toLowerCase();
  const releaseShaMatched = runtimeSha === String(targetSha).toLowerCase();

  return {
    passed: response.status === 200 && bodyStatus === 'ok' && noStore && releaseShaMatched,
    path: '/api/ready/release',
    status: response.status,
    bodyStatus: bodyStatus || null,
    noStore,
    releaseShaMatched,
    canonicalFallbackUsed: true,
  };
}

function safeHealthEvidence(health) {
  if (!health) return null;
  return {
    path: health.path || '/api/health',
    status: Number(health.status) || 0,
    bodyStatus: health.bodyStatus || null,
    noStore: health.noStore === true,
    protectionBypassUsed: health.protectionBypassUsed === true,
    blockedByVercelProtection: health.blockedByVercelProtection === true,
    releaseShaMatched: health.releaseShaMatched === true,
    canonicalFallbackUsed: health.canonicalFallbackUsed === true,
  };
}

function failureEvidence(baseEvidence, blocker, deployment = null, health = null) {
  return {
    ...baseEvidence,
    status: 'OPEN',
    outcome: 'failed',
    blockers: [blocker],
    health: safeHealthEvidence(health),
    checks: {
      currentMainShaBound: blocker !== 'target_sha_is_not_current_main' && blocker !== 'invalid_proof_context',
      exactShaProductionDeploymentFound: Boolean(deployment),
      vercelSuccessStatusFound: Boolean(deployment),
      productionHealthOk: health?.passed === true,
      productionHealthNoStore: health?.noStore === true,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: FULL_SHA.test(baseEvidence.targetSha),
      githubDeploymentBound: deployment?.source === 'github_deployment_status',
      githubCommitStatusBound: false,
      liveHealthVerified: health?.passed === true,
      tokenPersisted: false,
      authorizationHeaderStored: false,
      protectionBypassSecretPersisted: false,
      rawResponseBodyStored: false,
    },
  };
}

async function tryDeploymentHealthCandidate({ deployment, protectionBypassSecret, fetchImpl }) {
  if (!deployment) return null;
  const health = await probeExactDeploymentHealth({
    publicUrl: deployment.publicUrl,
    protectionBypassSecret,
    fetchImpl,
  });
  return { deployment, health };
}

export async function buildProductionDeploymentEvidence({
  repository,
  targetSha,
  token,
  protectionBypassSecret = '',
  healthcheckToken = '',
  fetchImpl = globalThis.fetch,
  sleepImpl = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms)),
  apiUrl = DEFAULT_API_URL,
  maxAttempts = DEFAULT_ATTEMPTS,
  pollMs = DEFAULT_POLL_MS,
}) {
  const baseEvidence = {
    schema: 'risck-comply.production-deployment-evidence.v1',
    evidenceItem: 'production-deployment',
    generatedAt: new Date().toISOString(),
    targetSha,
    commitSha: targetSha,
    repository,
    environment: 'Production',
    provider: 'Vercel',
  };

  if (repository !== EXPECTED_REPOSITORY || !FULL_SHA.test(targetSha) || !token) {
    return failureEvidence(baseEvidence, 'invalid_proof_context');
  }

  const mainMatches = await currentMainMatches({ repository, targetSha, token, fetchImpl, apiUrl });
  if (!mainMatches) return failureEvidence(baseEvidence, 'target_sha_is_not_current_main');

  let deployment = null;
  let health = null;
  let immutableProtectionObserved = false;
  const attempts = boundedInteger(maxAttempts, DEFAULT_ATTEMPTS, 1, 60);
  const waitMs = boundedInteger(pollMs, DEFAULT_POLL_MS, 0, 30_000);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const deploymentStatusCandidate = await findExactShaVercelProductionDeployment({
      repository,
      targetSha,
      token,
      fetchImpl,
      apiUrl,
    });

    const immutableAttempt = await tryDeploymentHealthCandidate({
      deployment: deploymentStatusCandidate,
      protectionBypassSecret,
      fetchImpl,
    });
    if (immutableAttempt?.health.passed) {
      deployment = immutableAttempt.deployment;
      health = immutableAttempt.health;
      break;
    }

    deployment = immutableAttempt?.deployment ?? null;
    health = immutableAttempt?.health ?? null;
    immutableProtectionObserved = immutableAttempt?.health?.blockedByVercelProtection === true;
    const immutableAuthBoundaryObserved = [401, 403].includes(Number(immutableAttempt?.health?.status ?? 0));
    const canonicalFallbackEligible = immutableProtectionObserved || immutableAuthBoundaryObserved;

    if (deployment && canonicalFallbackEligible && !String(protectionBypassSecret ?? '').trim()) {
      const canonicalHealth = await probeCanonicalReleaseHealth({
        publicUrl: EXPECTED_CANONICAL_PRODUCTION_URL,
        targetSha,
        healthcheckToken,
        fetchImpl,
      });
      if (canonicalHealth.passed) {
        health = canonicalHealth;
        break;
      }
    }

    if (attempt < attempts && waitMs > 0) await sleepImpl(waitMs);
  }

  if (!deployment) return failureEvidence(baseEvidence, 'exact_vercel_production_deployment_unproven');
  if (!health?.passed) {
    const blocker = immutableProtectionObserved && !String(protectionBypassSecret ?? '').trim()
      ? 'immutable_deployment_health_blocked_by_vercel_protection'
      : 'production_deployment_health_unproven';
    return failureEvidence(baseEvidence, blocker, deployment, health);
  }

  const finalMainMatches = await currentMainMatches({ repository, targetSha, token, fetchImpl, apiUrl });
  if (!finalMainMatches) return failureEvidence(baseEvidence, 'target_sha_is_not_current_main', deployment, health);

  return {
    ...baseEvidence,
    status: 'PASS',
    outcome: 'passed',
    summary: health?.canonicalFallbackUsed === true
      ? 'GitHub records a successful Vercel Production deployment for the exact current main SHA, and the authenticated canonical release endpoint confirms the same exact SHA with no-store.'
      : 'GitHub records a successful Vercel Production deployment for the exact current main SHA, and the immutable deployment health endpoint responds successfully with no-store.',
    deployment: {
      proofSource: deployment.source,
      id: deployment.deploymentId,
      statusId: deployment.deploymentStatusId,
      providerDeploymentId: deployment.providerDeploymentId,
      targetHost: deployment.targetHost,
      deploymentCreatedAt: deployment.deploymentCreatedAt,
      deploymentUpdatedAt: deployment.deploymentUpdatedAt,
      statusCreatedAt: deployment.statusCreatedAt,
      statusUpdatedAt: deployment.statusUpdatedAt,
      status: 'success',
      actor: EXPECTED_VERCEL_ACTOR,
    },
    checks: {
      currentMainShaBound: true,
      exactShaProductionDeploymentFound: true,
      vercelSuccessStatusFound: true,
      productionHealthOk: true,
      productionHealthNoStore: true,
      immutableDeploymentHealthOk: health?.canonicalFallbackUsed !== true,
      immutableDeploymentProtectionObserved: immutableProtectionObserved,
      immutableDeploymentAuthBoundaryObserved: [401, 403].includes(Number(health?.status ?? 0)) && health?.canonicalFallbackUsed !== true,
      canonicalProductionHealthFallbackUsed: health?.canonicalFallbackUsed === true,
    },
    health: {
      path: health.path || '/api/health',
      status: health.status,
      bodyStatus: health.bodyStatus,
      noStore: health.noStore,
      targetClass: health?.canonicalFallbackUsed === true
        ? 'canonical_public_production'
        : 'immutable_vercel_deployment',
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: true,
      githubDeploymentBound: true,
      githubCommitStatusBound: false,
      uniqueProviderDeploymentIdBound: false,
      vercelStatusActorBound: true,
      liveHealthVerified: true,
      immutableProtectionObserved,
      tokenPersisted: false,
      authorizationHeaderStored: false,
      protectionBypassSecretPersisted: false,
      rawResponseBodyStored: false,
    },
    truthBoundary: 'This evidence proves only that Vercel reported a successful Production deployment for the exact current main SHA through an explicit GitHub deployment status and that Production health passed with no-store. Canonical fallback is accepted only through the authenticated /api/ready/release endpoint when it reports the same exact target SHA and only after the immutable Vercel URL is blocked by Vercel protection or a Vercel authentication boundary (401/403); generic public /api/health is never sufficient for exact-SHA substitution. Preview deployments are never accepted as Production authority. Generic commit statuses, arbitrary redirects, SHA-mismatched canonical responses, and unhealthy immutable deployments are never accepted as exact-SHA Production proof. It does not prove provider secret inventory, authenticated application flows, rollback rehearsal, observability, billing, legal approval, or final release GO.',
  };
}

async function main() {
  const repository = env('GITHUB_REPOSITORY');
  const targetSha = (env('TARGET_SHA') || env('RELEASE_COMMIT_SHA') || env('GITHUB_SHA')).toLowerCase();
  const token = env('GITHUB_TOKEN');
  const protectionBypassSecret = env('VERCEL_AUTOMATION_BYPASS_SECRET');
  const healthcheckToken = env('HEALTHCHECK_TOKEN');
  const outputPath = resolve(env('PRODUCTION_DEPLOYMENT_EVIDENCE_PATH') || DEFAULT_OUTPUT);
  const maxAttempts = boundedInteger(env('PRODUCTION_DEPLOYMENT_PROOF_ATTEMPTS'), DEFAULT_ATTEMPTS, 1, 60);
  const pollMs = boundedInteger(env('PRODUCTION_DEPLOYMENT_PROOF_POLL_MS'), DEFAULT_POLL_MS, 0, 30_000);

  const evidence = await buildProductionDeploymentEvidence({
    repository,
    targetSha,
    token,
    protectionBypassSecret,
    healthcheckToken,
    maxAttempts,
    pollMs,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);

  console.log(JSON.stringify({
    evidence: outputPath,
    targetSha,
    status: evidence.status,
    outcome: evidence.outcome,
    proofSource: evidence.deployment?.proofSource ?? null,
    blockers: evidence.blockers ?? [],
  }, null, 2));

  if (evidence.status !== 'PASS' || evidence.outcome !== 'passed') process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath && import.meta.url === invokedPath) await main();