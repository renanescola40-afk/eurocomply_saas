#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/deployment-health-validation.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const runner = 'scripts/security/run-deployment-health-validation.mjs';
const shouldPromote = process.argv.includes('--update-register');
const noWrite = process.argv.includes('--no-write');
const inputUrl = process.env.DEPLOYMENT_HEALTH_URL ?? process.env.DEPLOYMENT_URL ?? process.argv.find((arg) => arg.startsWith('https://')) ?? '';
const environment = String(process.env.DEPLOYMENT_ENVIRONMENT ?? 'preview').trim().toLowerCase();
const expectedCommitSha = String(process.env.EXPECTED_DEPLOYMENT_COMMIT_SHA ?? '').trim();
const healthcheckToken = String(process.env.HEALTHCHECK_TOKEN ?? '').trim();
const vercelToken = String(process.env.VERCEL_TOKEN ?? '').trim();
const vercelTeamId = String(process.env.VERCEL_TEAM_ID ?? '').trim();
const timeoutMs = Number.parseInt(process.env.DEPLOYMENT_HEALTH_TIMEOUT_MS ?? '15000', 10);
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function normalizeBaseUrl(value) {
  const url = new URL(String(value ?? '').trim());
  if (url.protocol !== 'https:') throw new Error('Deployment validation requires https.');
  url.username = '';
  url.password = '';
  url.hash = '';
  url.search = '';
  url.pathname = '/';
  return url;
}

function endpoint(baseUrl, path) {
  return new URL(path, baseUrl);
}

function evidenceUrl(url) {
  return `${url.protocol}//${url.hostname}${url.pathname}`;
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000);
  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
      ...options,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function assertHealthy(baseUrl) {
  const url = endpoint(baseUrl, '/api/health');
  const response = await request(url);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== 'ok') throw new Error('Health check failed.');
  return {
    url: evidenceUrl(url),
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    contentTypeOptions: response.headers.get('x-content-type-options'),
  };
}

async function assertReady(baseUrl) {
  if (!healthcheckToken) {
    if (environment === 'production') throw new Error('Production readiness validation requires HEALTHCHECK_TOKEN.');
    return { outcome: 'skipped', reason: 'HEALTHCHECK_TOKEN not configured for this environment' };
  }

  const url = endpoint(baseUrl, '/api/ready');
  const response = await request(url, {
    headers: { Authorization: `Bearer ${healthcheckToken}` },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== 'ready') throw new Error('Readiness check failed.');
  return {
    outcome: 'passed',
    url: evidenceUrl(url),
    status: response.status,
    responseDetailsPersisted: false,
  };
}

async function readVercelDeployment(baseUrl) {
  if (!expectedCommitSha) throw new Error('EXPECTED_DEPLOYMENT_COMMIT_SHA is required.');
  if (!vercelToken) {
    if (environment === 'production') throw new Error('Production provenance validation requires VERCEL_TOKEN.');
    return {
      outcome: 'not_verified',
      expectedCommitSha,
      reason: 'VERCEL_TOKEN not configured for this environment',
    };
  }

  const apiUrl = new URL(`https://api.vercel.com/v13/deployments/${baseUrl.hostname}`);
  if (vercelTeamId) apiUrl.searchParams.set('teamId', vercelTeamId);
  const response = await request(apiUrl, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  });
  if (!response.ok) throw new Error(`Vercel deployment metadata request failed with HTTP ${response.status}.`);

  const deployment = await response.json();
  const observedCommitSha = String(
    deployment?.meta?.githubCommitSha
      ?? deployment?.meta?.gitCommitSha
      ?? deployment?.gitSource?.sha
      ?? '',
  ).trim();
  if (!observedCommitSha) throw new Error('Vercel deployment metadata did not include a commit SHA.');
  if (observedCommitSha !== expectedCommitSha) {
    throw new Error('Vercel deployment commit SHA does not match the expected GitHub commit SHA.');
  }

  return {
    outcome: 'passed',
    expectedCommitSha,
    observedCommitSha,
    deploymentId: deployment?.id ?? deployment?.uid ?? null,
    deploymentState: deployment?.readyState ?? deployment?.state ?? null,
    target: deployment?.target ?? null,
    createdAt: deployment?.createdAt ?? deployment?.created ?? null,
  };
}

function githubActions() {
  const repository = process.env.GITHUB_REPOSITORY ?? null;
  const runId = process.env.GITHUB_RUN_ID ?? null;
  return {
    generatedInGitHubActions: Boolean(repository && runId),
    workflow: process.env.GITHUB_WORKFLOW ?? null,
    runId,
    runUrl: repository && runId ? `https://github.com/${repository}/actions/runs/${runId}` : null,
    repository,
    commitSha: process.env.GITHUB_SHA ?? null,
    refName: process.env.GITHUB_REF_NAME ?? null,
    eventName: process.env.GITHUB_EVENT_NAME ?? null,
    stampedAt: now(),
  };
}

function buildEvidence({ status, baseUrl, health = null, readiness = null, provenance = null, failure = null }) {
  return {
    schema: 'eurocomply.runtime.deployment-health-validation.v2',
    evidenceItem: 'deployment-health-validation',
    status,
    reviewer: 'EuroComply deployment assurance automation',
    reviewedAt: now(),
    environment,
    summary: status === 'Complete'
      ? 'Live deployment health, readiness policy and Vercel commit provenance were evaluated for the selected environment.'
      : 'Deployment assurance failed closed; the deployment must not be promoted.',
    evidenceLocations: [evidencePath, runner, registerPath],
    redactionConfirmation: 'Tokens and response payload details are not persisted.',
    runner,
    target: baseUrl ? {
      url: `${baseUrl.protocol}//${baseUrl.hostname}`,
      host: baseUrl.hostname,
      queryRemoved: true,
    } : null,
    healthCheck: health,
    readinessCheck: readiness,
    provenanceCheck: provenance,
    failure: failure ? { message: failure } : null,
    githubActions: githubActions(),
    acceptanceCriteria: {
      liveHttpsRequestPerformed: Boolean(health),
      healthEndpointReturnedExpectedResponse: Boolean(health),
      productionReadinessAuthenticated: environment !== 'production' || readiness?.outcome === 'passed',
      productionCommitProvenanceVerified: environment !== 'production' || provenance?.outcome === 'passed',
      releaseBlockedOnFailure: true,
      p0RegisterMayBePromoted: status === 'Complete',
    },
  };
}

function writeEvidence(evidence) {
  if (noWrite) return;
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

function promoteRegister(evidence) {
  if (!shouldPromote || noWrite || evidence.status !== 'Complete') return;
  const source = readFileSync(registerPath, 'utf8');
  const oldRow = source.split('\n').find((line) => line.startsWith('| Deployment URL functional verification |'));
  if (!oldRow) throw new Error(`${registerPath} missing Deployment URL functional verification row`);
  if (oldRow.includes('| Complete |') && oldRow.includes(evidencePath)) return;
  const newRow = '| Deployment URL functional verification | Complete | `docs/security/evidence/runtime/deployment-health-validation.json` records live HTTPS health, environment-aware readiness and Vercel commit provenance validation | Platform owner | Revalidate before Go and after every deployment target change |';
  writeFileSync(registerPath, source.replace(oldRow, newRow));
}

async function main() {
  let baseUrl;
  try {
    if (!['preview', 'production'].includes(environment)) throw new Error('DEPLOYMENT_ENVIRONMENT must be preview or production.');
    baseUrl = normalizeBaseUrl(inputUrl);
    const health = await assertHealthy(baseUrl);
    const readiness = await assertReady(baseUrl);
    const provenance = await readVercelDeployment(baseUrl);
    const evidence = buildEvidence({ status: 'Complete', baseUrl, health, readiness, provenance });
    writeEvidence(evidence);
    promoteRegister(evidence);
    console.log(`Deployment assurance passed for ${evidence.target.url} (${environment}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeEvidence(buildEvidence({ status: 'Blocked', baseUrl, failure: message }));
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
