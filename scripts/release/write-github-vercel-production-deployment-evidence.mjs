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

function successfulVercelStatus(status) {
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

    const status = statusesResponse.body.find(successfulVercelStatus);
    if (!status) continue;

    const publicUrl = status.environment_url || status.target_url;
    return {
      deploymentId: deployment.id,
      deploymentStatusId: status.id,
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

export async function probeExactDeploymentHealth({ publicUrl, fetchImpl = globalThis.fetch }) {
  let healthUrl;
  try {
    healthUrl = new URL('/api/health', publicUrl);
  } catch {
    return { passed: false, status: 0, bodyStatus: null, noStore: false };
  }

  let response;
  try {
    response = await fetchImpl(healthUrl, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'risck-comply-production-deployment-proof',
      },
    });
  } catch {
    return { passed: false, status: 0, bodyStatus: null, noStore: false };
  }

  const body = response.ok ? await readBoundedJson(response, 64 * 1024) : null;
  if (!response.ok) await response.body?.cancel().catch(() => undefined);
  const noStore = /\bno-store\b/i.test(String(response.headers.get('cache-control') ?? ''));
  const bodyStatus = String(body?.status ?? '');
  return {
    passed: response.status === 200 && bodyStatus === 'ok' && noStore,
    status: response.status,
    bodyStatus: bodyStatus || null,
    noStore,
  };
}

function failureEvidence(baseEvidence, blocker, deployment = null, health = null) {
  return {
    ...baseEvidence,
    status: 'OPEN',
    outcome: 'failed',
    blockers: [blocker],
    checks: {
      currentMainShaBound: blocker !== 'target_sha_is_not_current_main' && blocker !== 'invalid_proof_context',
      exactShaProductionDeploymentFound: Boolean(deployment),
      vercelSuccessStatusFound: Boolean(deployment),
      exactDeploymentHealthOk: health?.passed === true,
      exactDeploymentHealthNoStore: health?.noStore === true,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: FULL_SHA.test(baseEvidence.targetSha),
      githubDeploymentBound: Boolean(deployment),
      liveHealthVerified: health?.passed === true,
      tokenPersisted: false,
      authorizationHeaderStored: false,
    },
  };
}

export async function buildProductionDeploymentEvidence({
  repository,
  targetSha,
  token,
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
  const attempts = boundedInteger(maxAttempts, DEFAULT_ATTEMPTS, 1, 60);
  const waitMs = boundedInteger(pollMs, DEFAULT_POLL_MS, 0, 30_000);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    deployment = await findExactShaVercelProductionDeployment({
      repository,
      targetSha,
      token,
      fetchImpl,
      apiUrl,
    });
    if (deployment) {
      health = await probeExactDeploymentHealth({ publicUrl: deployment.publicUrl, fetchImpl });
      if (health.passed) break;
    }
    if (attempt < attempts && waitMs > 0) await sleepImpl(waitMs);
  }

  if (!deployment) return failureEvidence(baseEvidence, 'exact_vercel_production_deployment_unproven');
  if (!health?.passed) return failureEvidence(baseEvidence, 'exact_deployment_health_unproven', deployment, health);

  return {
    ...baseEvidence,
    status: 'PASS',
    outcome: 'passed',
    summary: 'GitHub records a successful Vercel Production deployment for the exact current main SHA, and the immutable deployment health endpoint responds successfully with no-store.',
    deployment: {
      id: deployment.deploymentId,
      statusId: deployment.deploymentStatusId,
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
      exactDeploymentHealthOk: true,
      exactDeploymentHealthNoStore: true,
    },
    health: {
      path: '/api/health',
      status: health.status,
      bodyStatus: health.bodyStatus,
      noStore: health.noStore,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: true,
      githubDeploymentBound: true,
      vercelStatusActorBound: true,
      liveHealthVerified: true,
      tokenPersisted: false,
      authorizationHeaderStored: false,
      rawResponseBodyStored: false,
    },
    truthBoundary: 'This evidence proves only that Vercel reported a successful Production deployment for the exact current main SHA through GitHub deployment status and that the immutable deployment /api/health endpoint passed. It does not prove provider secret inventory, authenticated application flows, rollback rehearsal, observability, billing, legal approval, or final release GO.',
  };
}

async function main() {
  const repository = env('GITHUB_REPOSITORY');
  const targetSha = (env('TARGET_SHA') || env('RELEASE_COMMIT_SHA') || env('GITHUB_SHA')).toLowerCase();
  const token = env('GITHUB_TOKEN');
  const outputPath = resolve(env('PRODUCTION_DEPLOYMENT_EVIDENCE_PATH') || DEFAULT_OUTPUT);
  const maxAttempts = boundedInteger(env('PRODUCTION_DEPLOYMENT_PROOF_ATTEMPTS'), DEFAULT_ATTEMPTS, 1, 60);
  const pollMs = boundedInteger(env('PRODUCTION_DEPLOYMENT_PROOF_POLL_MS'), DEFAULT_POLL_MS, 0, 30_000);

  const evidence = await buildProductionDeploymentEvidence({
    repository,
    targetSha,
    token,
    maxAttempts,
    pollMs,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);

  console.log(JSON.stringify({
    evidence: DEFAULT_OUTPUT,
    targetSha,
    status: evidence.status,
    outcome: evidence.outcome,
    deploymentId: evidence.deployment?.id ?? null,
    blockers: evidence.blockers ?? [],
  }, null, 2));

  if (evidence.status !== 'PASS' || evidence.outcome !== 'passed') process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath && import.meta.url === invokedPath) await main();
