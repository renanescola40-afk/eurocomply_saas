#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/deployment-health-validation.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const runner = 'scripts/security/run-deployment-health-validation.mjs';
const updateRegister = process.argv.includes('--update-register');
const noWrite = process.argv.includes('--no-write');
const timeoutMs = Number.parseInt(process.env.DEPLOYMENT_HEALTH_TIMEOUT_MS ?? '15000', 10);
const inputUrl = process.env.DEPLOYMENT_HEALTH_URL ?? process.env.DEPLOYMENT_URL ?? process.argv.find((arg) => arg.startsWith('https://')) ?? '';
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function normalizeTarget(value) {
  const url = new URL(String(value ?? '').trim());
  if (url.protocol !== 'https:') throw new Error('Deployment health validation requires an https URL.');
  url.username = '';
  url.password = '';
  url.hash = '';
  url.search = '';
  if (!url.pathname || url.pathname === '/') url.pathname = '/api/health';
  return url;
}

function targetForEvidence(url) {
  return `${url.protocol}//${url.hostname}${url.pathname}`;
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

async function getHealth(url) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json,text/plain,*/*' },
    });
    await response.arrayBuffer().catch(() => null);
    return {
      statusCode: response.status,
      ok: response.status >= 200 && response.status < 300,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type'),
      errorName: null,
    };
  } catch (error) {
    return {
      statusCode: null,
      ok: false,
      durationMs: Date.now() - startedAt,
      contentType: null,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildEvidence(targetUrl, result) {
  const passed = result.ok === true;
  return {
    schema: 'eurocomply.runtime.deployment-health-validation.v1',
    evidenceItem: 'deployment-health-validation',
    status: passed ? 'Complete' : 'Exception',
    reviewer: 'EuroComply deployment health automation',
    reviewedAt: now(),
    summary: passed
      ? 'Deployment health validation completed against a live HTTPS deployment URL and /api/health returned a successful HTTP status.'
      : 'Deployment health validation did not complete successfully; release remains blocked until a network-capable runner records a passing /api/health response.',
    evidenceLocations: [
      evidencePath,
      'scripts/security/run-deployment-health-validation.mjs',
      'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
    ],
    redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    runner,
    commandUsed: `node ${runner}${updateRegister ? ' --update-register' : ''}`,
    target: {
      url: targetForEvidence(targetUrl),
      host: targetUrl.hostname,
      path: targetUrl.pathname,
      queryRemoved: true,
    },
    httpResult: result,
    controlsVerified: passed ? [
      'A network-capable runner performed a real HTTPS GET request to /api/health.',
      'The deployment health endpoint returned a successful HTTP status.',
      'The evidence stores only URL host/path, status code, duration and content type.',
      'The response body and response headers are not persisted.',
    ] : [
      'Deployment health validation is fail-closed: non-2xx, timeout or network error keeps the P0 row blocked.',
    ],
    githubActions: githubActions(),
    acceptanceCriteria: {
      liveHttpsRequestPerformed: true,
      healthEndpointReturned2xx: passed,
      evidenceBodyPersisted: false,
      releaseBlockedOnFailure: !passed,
      p0RegisterMayBePromoted: passed,
    },
    exception: passed ? undefined : {
      riskOwner: 'Platform owner',
      rationale: 'Deployment health must be verified from a network-capable release runner before production Go.',
      compensatingControls: [
        'Keep deployment URL functional verification Open in the P0 runtime evidence register.',
        'Rerun with a reachable HTTPS deployment URL and successful /api/health response.',
      ],
      expiresAt: '2026-06-25',
      approvalReference: 'P0_RUNTIME_EVIDENCE_REGISTER.md#deployment-url-functional-verification',
    },
  };
}

function writeEvidence(evidence) {
  if (noWrite) return;
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

function updateRegister(evidence) {
  if (!updateRegister || noWrite || evidence.status !== 'Complete') return;
  const source = readFileSync(registerPath, 'utf8');
  const oldRow = source.split('\n').find((line) => line.startsWith('| Deployment URL functional verification |'));
  if (!oldRow) throw new Error(`${registerPath} missing Deployment URL functional verification row`);
  if (oldRow.includes('| Complete |') && oldRow.includes(evidencePath)) return;
  const newRow = '| Deployment URL functional verification | Complete | `docs/security/evidence/runtime/deployment-health-validation.json` records live HTTPS `/api/health` validation with successful HTTP status, GitHub Actions provenance when available and fail-closed behavior for non-2xx/timeouts/network errors | Platform owner | Revalidate before Go and after every deployment target change |';
  writeFileSync(registerPath, source.replace(oldRow, newRow));
}

async function main() {
  const targetUrl = normalizeTarget(inputUrl);
  const result = await getHealth(targetUrl);
  const evidence = buildEvidence(targetUrl, result);
  writeEvidence(evidence);
  updateRegister(evidence);
  if (evidence.status === 'Complete') {
    console.log(`Deployment health validation passed for ${evidence.target.url}`);
  } else {
    console.error(`Deployment health validation failed for ${evidence.target.url}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
