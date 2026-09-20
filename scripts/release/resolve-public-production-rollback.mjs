#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const VERCEL_CLI_VERSION = '56.3.2';
export const EVIDENCE_PATH = 'artifacts/release/public-ga-rollback-resolution.json';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/;
const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_CLI_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_CANDIDATES = 20;

class ResolverError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ResolverError';
    this.code = code;
  }
}

function intEnv(name, fallback, min, max) {
  const parsed = Number.parseInt(String(process.env[name] || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new ResolverError(`missing_${name.toLowerCase()}`);
  return value;
}

function isSha(value) {
  return FULL_SHA.test(String(value || '').toLowerCase());
}

function isDeploymentId(value) {
  return DEPLOYMENT_ID.test(String(value || ''));
}

function stateOf(item) {
  return String(item?.state || item?.readyState || '').toUpperCase();
}

function targetOf(item) {
  return String(item?.target || '').toLowerCase();
}

function deploymentIdOf(item) {
  return String(item?.uid || item?.id || '').trim();
}

function shaOf(item) {
  return String(item?.meta?.githubCommitSha || '').trim().toLowerCase();
}

function createdAtOf(item) {
  const raw = item?.createdAt ?? item?.created ?? null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function normalizeDeploymentUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:') return null;
    if (!url.hostname.endsWith('.vercel.app') || url.hostname === 'vercel.app') return null;
    if (url.username || url.password || url.port) return null;
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function selectRollbackCandidate(items, {
  releaseSha,
  currentDeploymentId,
  currentCreatedAt,
  repository,
}) {
  const [repoOwner, repoName] = String(repository || '').split('/');
  const candidates = Array.isArray(items) ? items : [];

  for (const item of candidates) {
    const id = deploymentIdOf(item);
    const sha = shaOf(item);
    const state = stateOf(item);
    const target = targetOf(item);
    const url = normalizeDeploymentUrl(item?.url);
    const createdAt = createdAtOf(item);
    const ref = String(item?.meta?.githubCommitRef || '').trim();
    const candidateRepo = String(item?.meta?.githubRepo || '').trim();
    const candidateOwner = String(item?.meta?.githubOrg || '').trim();

    if (!isDeploymentId(id) || !isSha(sha) || !url || !createdAt) continue;
    if (id === currentDeploymentId || sha === releaseSha) continue;
    if (state !== 'READY' || target !== 'production') continue;
    if (createdAt >= currentCreatedAt) continue;
    if (ref && ref !== 'main') continue;
    if (repoName && candidateRepo && candidateRepo !== repoName) continue;
    if (repoOwner && candidateOwner && candidateOwner !== repoOwner) continue;

    return { id, sha, url, createdAt };
  }

  return null;
}

export function buildVercelCurlArgs(baseUrl) {
  return [
    '--yes',
    `vercel@${VERCEL_CLI_VERSION}`,
    'curl',
    '/api/health',
    '--deployment',
    baseUrl,
  ];
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
}

export function parseHealthBody(output) {
  const clean = stripAnsi(output).trim();
  if (!clean) return null;

  const attempts = [
    clean,
    ...clean.split(/\r?\n/).reverse(),
  ];

  for (const candidate of attempts) {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      // Try the next safe candidate.
    }
  }

  const start = clean.lastIndexOf('{');
  const end = clean.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

async function fetchJson(url, { token, timeoutMs }) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'risck-comply-public-ga-rollback-resolver/2.0',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ResolverError('provider_request_failed');
  }

  if (!response.ok) {
    throw new ResolverError('provider_request_rejected');
  }

  try {
    return await response.json();
  } catch {
    throw new ResolverError('provider_response_invalid_json');
  }
}

async function directHealthProbe(baseUrl, timeoutMs) {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'risck-comply-public-ga-rollback-resolver/2.0',
  };

  const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
  if (bypass) {
    headers['x-vercel-protection-bypass'] = bypass;
    headers['x-vercel-set-bypass-cookie'] = 'true';
  }

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    let body = null;
    if (response.status === 200) {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    }

    return {
      passed: response.status === 200 && body?.status === 'ok',
      status: response.status,
      protectionBlocked: [302, 401, 403].includes(response.status),
    };
  } catch {
    return {
      passed: false,
      status: 0,
      protectionBlocked: false,
    };
  }
}

function vercelCliHealthProbe(baseUrl, token, timeoutMs) {
  const result = spawnSync(
    'npx',
    buildVercelCurlArgs(baseUrl),
    {
      encoding: 'utf8',
      env: { ...process.env, VERCEL_TOKEN: token },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      maxBuffer: 256 * 1024,
    },
  );

  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');
  const body = result.status === 0 && !result.error
    ? parseHealthBody(result.stdout)
    : null;

  return {
    passed: !result.error && result.status === 0 && body?.status === 'ok',
    exitCode: Number.isInteger(result.status) ? result.status : null,
    timedOut,
  };
}

function validateCurrentDeployment(detail, {
  projectId,
  releaseSha,
  currentDeploymentId,
}) {
  const id = deploymentIdOf(detail);
  const sha = shaOf(detail);
  const state = stateOf(detail);
  const target = targetOf(detail);
  const createdAt = createdAtOf(detail);

  if (id && id !== currentDeploymentId) throw new ResolverError('current_deployment_identity_mismatch');
  if (String(detail?.projectId || '') !== projectId) throw new ResolverError('current_deployment_project_mismatch');
  if (sha !== releaseSha) throw new ResolverError('current_deployment_sha_mismatch');
  if (state !== 'READY') throw new ResolverError('current_deployment_not_ready');
  if (target && target !== 'production') throw new ResolverError('current_deployment_not_production');
  if (!createdAt) throw new ResolverError('current_deployment_created_at_missing');

  return createdAt;
}

function validateRollbackDeployment(detail, candidate, projectId) {
  const id = deploymentIdOf(detail);
  const sha = shaOf(detail);
  const state = stateOf(detail);
  const target = targetOf(detail);

  if (id && id !== candidate.id) throw new ResolverError('rollback_deployment_identity_mismatch');
  if (String(detail?.projectId || '') !== projectId) throw new ResolverError('rollback_deployment_project_mismatch');
  if (sha !== candidate.sha) throw new ResolverError('rollback_deployment_sha_mismatch');
  if (state !== 'READY') throw new ResolverError('rollback_deployment_not_ready');
  if (target && target !== 'production') throw new ResolverError('rollback_deployment_not_production');
}

function githubOutput(name, value) {
  const output = String(process.env.GITHUB_OUTPUT || '').trim();
  if (!output) return;
  appendFileSync(output, `${name}=${value}\n`);
}

function safeFailureCode(error) {
  if (error instanceof ResolverError) return error.code;
  return 'unexpected_resolver_failure';
}

function writeEvidence({
  passed,
  failure,
  transport,
  directStatus,
  cliExitCode,
  cliTimedOut,
  candidateSelected,
  providerIdentityVerified,
}) {
  const evidence = {
    schema: 'risck-comply.public-ga-rollback-resolution.v2',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    generatedAt: new Date().toISOString(),
    resolutionMode: 'automatic',
    policy: {
      exactProjectRequired: true,
      exactCurrentReleaseExcluded: true,
      previousDeploymentRequired: true,
      deploymentStateRequired: 'READY',
      deploymentTargetRequired: 'production',
      mainGitDeploymentPreferred: true,
      protectedDeploymentProbeSupported: true,
    },
    checks: {
      candidateSelected: Boolean(candidateSelected),
      providerIdentityVerified: Boolean(providerIdentityVerified),
      healthEndpointValidated: Boolean(passed),
    },
    healthProbe: {
      transport: transport || null,
      directStatus: Number.isInteger(directStatus) ? directStatus : null,
      cliExitCode: Number.isInteger(cliExitCode) ? cliExitCode : null,
      cliTimedOut: Boolean(cliTimedOut),
    },
    failure: passed ? null : failure || 'rollback_validation_failed',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      selectedRollbackIdentifiersStored: false,
      rawDeploymentUrlStored: false,
      rawProviderPayloadStored: false,
      rawHealthPayloadStored: false,
      rawCliOutputStored: false,
      tokenStored: false,
    },
  };

  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

export async function runResolver() {
  const httpTimeoutMs = intEnv('RELEASE_ROLLBACK_HEALTH_TIMEOUT_MS', DEFAULT_HTTP_TIMEOUT_MS, 2_000, 60_000);
  const cliTimeoutMs = intEnv('RELEASE_ROLLBACK_CLI_TIMEOUT_MS', DEFAULT_CLI_TIMEOUT_MS, 15_000, 180_000);
  const maxCandidates = intEnv('RELEASE_ROLLBACK_MAX_CANDIDATES', DEFAULT_MAX_CANDIDATES, 2, 100);

  const token = required('VERCEL_TOKEN');
  const orgId = required('VERCEL_ORG_ID');
  const projectId = required('VERCEL_PROJECT_ID');
  const releaseSha = required('RELEASE_SHA').toLowerCase();
  const currentDeploymentId = required('CURRENT_VERCEL_DEPLOYMENT_ID');
  const repository = required('GITHUB_REPOSITORY');

  if (!isSha(releaseSha)) throw new ResolverError('invalid_release_sha');
  if (!isDeploymentId(currentDeploymentId)) throw new ResolverError('invalid_current_deployment_id');

  let candidateSelected = false;
  let providerIdentityVerified = false;
  let directStatus = null;
  let cliExitCode = null;
  let cliTimedOut = false;
  let transport = null;

  try {
    const currentEndpoint = new URL(
      `/v13/deployments/${encodeURIComponent(currentDeploymentId)}`,
      'https://api.vercel.com',
    );
    currentEndpoint.searchParams.set('teamId', orgId);

    const current = await fetchJson(currentEndpoint, { token, timeoutMs: httpTimeoutMs });
    const currentCreatedAt = validateCurrentDeployment(current, {
      projectId,
      releaseSha,
      currentDeploymentId,
    });

    const listEndpoint = new URL('https://api.vercel.com/v7/deployments');
    listEndpoint.searchParams.set('projectId', projectId);
    listEndpoint.searchParams.set('teamId', orgId);
    listEndpoint.searchParams.set('target', 'production');
    listEndpoint.searchParams.set('limit', String(maxCandidates));

    const payload = await fetchJson(listEndpoint, { token, timeoutMs: httpTimeoutMs });
    const candidate = selectRollbackCandidate(payload?.deployments, {
      releaseSha,
      currentDeploymentId,
      currentCreatedAt,
      repository,
    });

    if (!candidate) throw new ResolverError('previous_ready_production_candidate_missing');
    candidateSelected = true;

    const candidateEndpoint = new URL(
      `/v13/deployments/${encodeURIComponent(candidate.id)}`,
      'https://api.vercel.com',
    );
    candidateEndpoint.searchParams.set('teamId', orgId);
    const candidateDetail = await fetchJson(candidateEndpoint, { token, timeoutMs: httpTimeoutMs });
    validateRollbackDeployment(candidateDetail, candidate, projectId);
    providerIdentityVerified = true;

    const direct = await directHealthProbe(candidate.url, httpTimeoutMs);
    directStatus = direct.status;

    if (direct.passed) {
      transport = 'direct';
    } else {
      const cli = vercelCliHealthProbe(candidate.url, token, cliTimeoutMs);
      cliExitCode = cli.exitCode;
      cliTimedOut = cli.timedOut;
      if (!cli.passed) {
        throw new ResolverError(
          cliTimedOut
            ? 'protected_health_probe_timeout'
            : 'protected_health_probe_failed',
        );
      }
      transport = 'vercel-cli';
    }

    writeEvidence({
      passed: true,
      failure: null,
      transport,
      directStatus,
      cliExitCode,
      cliTimedOut,
      candidateSelected,
      providerIdentityVerified,
    });
    githubOutput('validated', 'true');
    githubOutput('transport', transport);
    console.log('Previous production rollback candidate passed provider identity and health validation.');
    console.log(`Wrote ${EVIDENCE_PATH}`);
    return;
  } catch (error) {
    const failure = safeFailureCode(error);
    writeEvidence({
      passed: false,
      failure,
      transport,
      directStatus,
      cliExitCode,
      cliTimedOut,
      candidateSelected,
      providerIdentityVerified,
    });
    githubOutput('validated', 'false');
    console.error(`Public GA rollback resolution failed closed: ${failure}`);
    console.log(`Wrote ${EVIDENCE_PATH}`);
    throw error;
  }
}

const directRun = Boolean(process.argv[1])
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (directRun) {
  runResolver().catch(() => {
    process.exitCode = 1;
  });
}
