#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVIDENCE_PATH = 'artifacts/release/public-ga-rollback-resolution.json';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/;
const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_OIDC_TIMEOUT_MS = 15_000;
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

export function selectRollbackCandidates(items, {
  releaseSha,
  currentDeploymentId,
  currentCreatedAt,
  repository,
}) {
  const [repoOwner, repoName] = String(repository || '').split('/');
  const candidates = Array.isArray(items) ? items : [];
  const selected = [];

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

    selected.push({ id, sha, url, createdAt });
  }

  return selected.sort((a, b) => b.createdAt - a.createdAt);
}

export function selectRollbackCandidate(items, options) {
  return selectRollbackCandidates(items, options)[0] ?? null;
}

export async function getGitHubActionsOidcToken(timeoutMs) {
  const requestUrl = String(process.env.ACTIONS_ID_TOKEN_REQUEST_URL || '').trim();
  const requestToken = String(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || '').trim();

  if (!requestUrl || !requestToken) {
    throw new ResolverError('github_oidc_unavailable');
  }

  let endpoint;
  try {
    endpoint = new URL(requestUrl);
    if (endpoint.protocol !== 'https:') throw new Error('invalid_protocol');
  } catch {
    throw new ResolverError('github_oidc_request_url_invalid');
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${requestToken}`,
        Accept: 'application/json',
        'User-Agent': 'risck-comply-public-ga-rollback-resolver/3.0',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ResolverError('github_oidc_request_failed');
  }

  if (!response.ok) {
    throw new ResolverError('github_oidc_request_rejected');
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new ResolverError('github_oidc_response_invalid_json');
  }

  const token = String(body?.value || '').trim();
  if (!token || token.split('.').length !== 3) {
    throw new ResolverError('github_oidc_token_invalid');
  }

  return token;
}

export async function protectedHealthProbe(baseUrl, oidcToken, timeoutMs) {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'risck-comply-public-ga-rollback-resolver/3.0',
        'x-vercel-trusted-oidc-idp-token': oidcToken,
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status !== 200) {
      return { passed: false };
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return {
      passed: body?.status === 'ok',
    };
  } catch {
    return {
      passed: false,
    };
  }
}


async function fetchJson(url, { token, timeoutMs }) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'risck-comply-public-ga-rollback-resolver/3.0',
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
    'User-Agent': 'risck-comply-public-ga-rollback-resolver/3.0',
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

const SAFE_FAILURE_CODES = new Set([
  'missing_vercel_token',
  'missing_vercel_org_id',
  'missing_vercel_project_id',
  'missing_release_sha',
  'missing_current_vercel_deployment_id',
  'missing_github_repository',
  'invalid_release_sha',
  'invalid_current_deployment_id',
  'provider_request_failed',
  'provider_request_rejected',
  'provider_response_invalid_json',
  'current_deployment_identity_mismatch',
  'current_deployment_project_mismatch',
  'current_deployment_sha_mismatch',
  'current_deployment_not_ready',
  'current_deployment_not_production',
  'current_deployment_created_at_missing',
  'previous_ready_production_candidate_missing',
  'previous_ready_production_candidate_unhealthy',
  'rollback_deployment_identity_mismatch',
  'rollback_deployment_project_mismatch',
  'rollback_deployment_sha_mismatch',
  'rollback_deployment_not_ready',
  'rollback_deployment_not_production',
  'protected_health_probe_timeout',
  'protected_health_probe_failed',
  'github_oidc_unavailable',
  'github_oidc_request_url_invalid',
  'github_oidc_request_failed',
  'github_oidc_request_rejected',
  'github_oidc_response_invalid_json',
  'github_oidc_token_invalid',
]);

function safeFailureCode(error) {
  if (!(error instanceof ResolverError)) return 'unexpected_resolver_failure';
  const code = String(error.code || '');
  return SAFE_FAILURE_CODES.has(code) ? code : 'unexpected_resolver_failure';
}

function writeSuccessEvidence() {
  const evidence = {
    schema: 'risck-comply.public-ga-rollback-resolution.v3',
    status: 'Complete',
    outcome: 'passed',
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
      rollbackCandidateValidated: true,
      providerIdentityValidated: true,
      healthEndpointValidated: true,
    },
    failure: null,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      selectedRollbackIdentifiersStored: false,
      rawDeploymentUrlStored: false,
      rawProviderPayloadStored: false,
      rawHealthPayloadStored: false,
      rawCliOutputStored: false,
      rawNetworkStatusStored: false,
      rawProcessExitCodeStored: false,
      tokenStored: false,
      networkDerivedFieldsStored: false,
    },
  };

  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

function writeFailureEvidence() {
  const evidence = {
    schema: 'risck-comply.public-ga-rollback-resolution.v3',
    status: 'Open',
    outcome: 'failed',
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
      rollbackCandidateValidated: false,
      providerIdentityValidated: false,
      healthEndpointValidated: false,
    },
    failure: 'rollback_validation_failed',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      selectedRollbackIdentifiersStored: false,
      rawDeploymentUrlStored: false,
      rawProviderPayloadStored: false,
      rawHealthPayloadStored: false,
      rawCliOutputStored: false,
      rawNetworkStatusStored: false,
      rawProcessExitCodeStored: false,
      tokenStored: false,
      networkDerivedFieldsStored: false,
    },
  };

  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

export async function runResolver() {
  const httpTimeoutMs = intEnv('RELEASE_ROLLBACK_HEALTH_TIMEOUT_MS', DEFAULT_HTTP_TIMEOUT_MS, 2_000, 60_000);
  const oidcTimeoutMs = intEnv('RELEASE_ROLLBACK_OIDC_TIMEOUT_MS', DEFAULT_OIDC_TIMEOUT_MS, 5_000, 60_000);
  const maxCandidates = intEnv('RELEASE_ROLLBACK_MAX_CANDIDATES', DEFAULT_MAX_CANDIDATES, 2, 100);

  const token = required('VERCEL_TOKEN');
  const orgId = required('VERCEL_ORG_ID');
  const projectId = required('VERCEL_PROJECT_ID');
  const releaseSha = required('RELEASE_SHA').toLowerCase();
  const currentDeploymentId = required('CURRENT_VERCEL_DEPLOYMENT_ID');
  const repository = required('GITHUB_REPOSITORY');

  if (!isSha(releaseSha)) throw new ResolverError('invalid_release_sha');
  if (!isDeploymentId(currentDeploymentId)) throw new ResolverError('invalid_current_deployment_id');

  let transport = null;
  let oidcToken = null;

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
    const candidates = selectRollbackCandidates(payload?.deployments, {
      releaseSha,
      currentDeploymentId,
      currentCreatedAt,
      repository,
    });

    if (candidates.length === 0) {
      throw new ResolverError('previous_ready_production_candidate_missing');
    }

    let validatedCandidate = false;

    for (const candidate of candidates) {
      transport = null;

      try {
        const candidateEndpoint = new URL(
          `/v13/deployments/${encodeURIComponent(candidate.id)}`,
          'https://api.vercel.com',
        );
        candidateEndpoint.searchParams.set('teamId', orgId);

        const candidateDetail = await fetchJson(candidateEndpoint, {
          token,
          timeoutMs: httpTimeoutMs,
        });
        validateRollbackDeployment(candidateDetail, candidate, projectId);

        const direct = await directHealthProbe(candidate.url, httpTimeoutMs);
        if (direct.passed) {
          transport = 'direct';
          validatedCandidate = true;
          break;
        }

        if (!oidcToken) {
          oidcToken = await getGitHubActionsOidcToken(oidcTimeoutMs);
        }

        const protectedProbe = await protectedHealthProbe(
          candidate.url,
          oidcToken,
          httpTimeoutMs,
        );
        if (protectedProbe.passed) {
          transport = 'github-oidc';
          validatedCandidate = true;
          break;
        }
      } catch {
        // Continue through the bounded candidate list. The release only fails
        // after every eligible previous production deployment is rejected.
      }
    }

    if (!validatedCandidate) {
      throw new ResolverError('previous_ready_production_candidate_unhealthy');
    }

    writeSuccessEvidence();
    githubOutput('validated', 'true');
    githubOutput('transport', transport);
    console.log('Previous production rollback candidate passed provider identity and health validation.');
    console.log(`Wrote ${EVIDENCE_PATH}`);
    return;
  } catch (error) {
    const failure = safeFailureCode(error);
    writeFailureEvidence();
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
