#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'artifacts/release/public-ga-rollback-resolution.json';
const timeoutMs = Number.parseInt(process.env.RELEASE_ROLLBACK_HEALTH_TIMEOUT_MS || '10000', 10);
const maxCandidates = Number.parseInt(process.env.RELEASE_ROLLBACK_MAX_CANDIDATES || '20', 10);

function now() {
  return new Date().toISOString();
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function isSha(value) {
  return /^[a-f0-9]{40}$/.test(String(value || '').toLowerCase());
}

function isDeploymentId(value) {
  return /^dpl_[A-Za-z0-9]+$/.test(String(value || ''));
}

function deploymentState(item) {
  return String(item?.state || item?.readyState || '').toUpperCase();
}

function deploymentId(item) {
  return String(item?.uid || item?.id || '');
}

function deploymentSha(item) {
  return String(item?.meta?.githubCommitSha || '').toLowerCase();
}

function deploymentTarget(item) {
  return String(item?.target || '').toLowerCase();
}

function deploymentUrl(item) {
  const raw = String(item?.url || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (parsed.protocol !== 'https:') return null;
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function responseHeaders() {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'risck-comply-public-ga-rollback-resolver/1.0',
  };

  const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
  if (bypass) {
    headers['x-vercel-protection-bypass'] = bypass;
    headers['x-vercel-set-bypass-cookie'] = 'true';
  }

  return headers;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json();
}

async function healthIsReady(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: responseHeaders(),
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status !== 200) return false;

    const body = await response.json();
    return body?.status === 'ok';
  } catch {
    return false;
  }
}

function writeGithubEnv(values) {
  const githubEnv = String(process.env.GITHUB_ENV || '').trim();
  if (!githubEnv) throw new Error('missing_github_env');

  for (const [name, value] of Object.entries(values)) {
    if (/\r|\n/.test(value)) throw new Error(`unsafe_env_value_${name.toLowerCase()}`);
    appendFileSync(githubEnv, `${name}=${value}\n`);
  }
}

const generatedAt = now();
const token = required('VERCEL_TOKEN');
const orgId = required('VERCEL_ORG_ID');
const projectId = required('VERCEL_PROJECT_ID');
const releaseSha = required('RELEASE_SHA').toLowerCase();
const currentDeploymentId = String(process.env.CURRENT_VERCEL_DEPLOYMENT_ID || '').trim();

if (!isSha(releaseSha)) throw new Error('invalid_release_sha');
if (currentDeploymentId && !isDeploymentId(currentDeploymentId)) {
  throw new Error('invalid_current_vercel_deployment_id');
}

const api = new URL('https://api.vercel.com/v7/deployments');
api.searchParams.set('projectId', projectId);
api.searchParams.set('teamId', orgId);
api.searchParams.set('target', 'production');
api.searchParams.set('limit', String(Math.max(1, Math.min(maxCandidates, 100))));

const payload = await fetchJson(api, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'risck-comply-public-ga-rollback-resolver/1.0',
  },
});

const candidates = Array.isArray(payload?.deployments) ? payload.deployments : [];
let selected = null;

for (const item of candidates) {
  const id = deploymentId(item);
  const sha = deploymentSha(item);
  const target = deploymentTarget(item);
  const state = deploymentState(item);
  const url = deploymentUrl(item);

  if (!isDeploymentId(id) || !isSha(sha) || !url) continue;
  if (currentDeploymentId && id === currentDeploymentId) continue;
  if (sha === releaseSha) continue;
  if (target !== 'production') continue;
  if (state !== 'READY') continue;

  if (await healthIsReady(url)) {
    selected = { id, sha, url };
    break;
  }
}

if (!selected) {
  const evidence = {
    schema: 'risck-comply.public-ga-rollback-resolution.v1',
    status: 'Open',
    outcome: 'failed',
    generatedAt,
    currentReleaseSha: releaseSha,
    currentDeploymentId: currentDeploymentId || null,
    candidatesExamined: candidates.length,
    selectedRollback: null,
    failure: 'no_previous_ready_production_deployment_with_healthy_api_health',
    containsSensitiveValues: false,
  };
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  throw new Error('healthy_rollback_target_missing');
}

writeGithubEnv({
  RELEASE_ROLLBACK_TARGET_URL: selected.url,
  RELEASE_ROLLBACK_TARGET: selected.url,
  LAST_KNOWN_GOOD_DEPLOYMENT_URL: selected.url,
  RELEASE_ROLLBACK_TARGET_SHA: selected.sha,
  LAST_KNOWN_GOOD_COMMIT_SHA: selected.sha,
  RELEASE_ROLLBACK_TARGET_VALIDATED: 'true',
});

const evidence = {
  schema: 'risck-comply.public-ga-rollback-resolution.v1',
  status: 'Complete',
  outcome: 'passed',
  generatedAt,
  currentReleaseSha: releaseSha,
  currentDeploymentId: currentDeploymentId || null,
  candidatesExamined: candidates.length,
  selectedRollback: {
    deploymentId: selected.id,
    commitSha: selected.sha,
    host: new URL(selected.url).host,
    healthEndpointValidated: true,
  },
  containsSensitiveValues: false,
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

console.log(`Resolved healthy rollback deployment: ${selected.id}`);
console.log(`Resolved healthy rollback SHA: ${selected.sha}`);
console.log(`Wrote ${evidencePath}`);
