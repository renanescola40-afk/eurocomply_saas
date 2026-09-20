#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'artifacts/release/public-ga-rollback-resolution.json';
const VERCEL_CLI_VERSION = '56.3.2';
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
    if (!parsed.hostname.endsWith('.vercel.app')) return null;
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
    'User-Agent': 'risck-comply-public-ga-rollback-resolver/1.1',
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

function healthIsReadyViaVercelCurl(baseUrl, token) {
  const result = spawnSync(
    'npx',
    [
      '--yes',
      `vercel@${VERCEL_CLI_VERSION}`,
      'curl',
      '/api/health',
      '--deployment',
      baseUrl,
      '--token',
      token,
      '--silent',
      '--show-error',
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, VERCEL_TOKEN: token },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs + 5_000,
      maxBuffer: 256 * 1024,
    },
  );

  if (result.error || result.status !== 0) return false;

  try {
    const body = JSON.parse(String(result.stdout || '').trim());
    return body?.status === 'ok';
  } catch {
    return false;
  }
}

async function healthIsReady(baseUrl, token) {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: responseHeaders(),
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status === 200) {
      const body = await response.json();
      if (body?.status === 'ok') return true;
    }
  } catch {
    // Fall through to the authenticated Vercel transport below.
  }

  return healthIsReadyViaVercelCurl(baseUrl, token);
}

function writeEvidence(outcome) {
  const evidence = outcome === 'passed'
    ? {
        schema: 'risck-comply.public-ga-rollback-resolution.v1',
        status: 'Complete',
        outcome: 'passed',
        generatedAt: now(),
        resolutionMode: 'automatic',
        priorProductionDeploymentFound: true,
        deploymentStateRequired: 'READY',
        deploymentTargetRequired: 'production',
        currentReleaseExcluded: true,
        healthEndpointValidated: true,
        protectionBypassSupported: true,
        selectedRollbackIdentifiersStored: false,
        containsSensitiveValues: false,
      }
    : {
        schema: 'risck-comply.public-ga-rollback-resolution.v1',
        status: 'Open',
        outcome: 'failed',
        generatedAt: now(),
        resolutionMode: 'automatic',
        priorProductionDeploymentFound: false,
        deploymentStateRequired: 'READY',
        deploymentTargetRequired: 'production',
        currentReleaseExcluded: true,
        healthEndpointValidated: false,
        protectionBypassSupported: true,
        selectedRollbackIdentifiersStored: false,
        failure: 'no_previous_ready_production_deployment_with_healthy_api_health',
        containsSensitiveValues: false,
      };

  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

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
    'User-Agent': 'risck-comply-public-ga-rollback-resolver/1.1',
  },
});

const candidates = Array.isArray(payload?.deployments) ? payload.deployments : [];
let foundHealthyRollback = false;

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

  if (await healthIsReady(url, token)) {
    foundHealthyRollback = true;
    break;
  }
}

if (!foundHealthyRollback) {
  writeEvidence('failed');
  throw new Error('healthy_rollback_target_missing');
}

writeEvidence('passed');
console.log('Resolved and health-validated a previous READY production deployment for rollback.');
console.log(`Wrote ${evidencePath}`);
