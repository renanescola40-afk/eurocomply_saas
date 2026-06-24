#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/deployment-health-validation.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const runner = 'scripts/security/run-deployment-health-validation.mjs';
const shouldPromote = process.argv.includes('--update-register');
const noWrite = process.argv.includes('--no-write');
const inputUrl = process.env.DEPLOYMENT_HEALTH_URL ?? process.env.DEPLOYMENT_URL ?? process.argv.find((arg) => arg.startsWith('https://')) ?? '';
const timeoutMs = Number.parseInt(process.env.DEPLOYMENT_HEALTH_TIMEOUT_MS ?? '15000', 10);
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

function evidenceUrl(url) {
  return `${url.protocol}//${url.hostname}${url.pathname}`;
}

async function requestHealth(url) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000);
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'manual', cache: 'no-store', signal: controller.signal });
    await response.arrayBuffer().catch(() => null);
    return {
      ok: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type'),
      errorName: null,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      durationMs: Date.now() - startedAt,
      contentType: null,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    };
  } finally {
    clearTimeout(timer);
  }
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
      : 'Deployment health validation did not complete successfully; release remains blocked until a passing /api/health response is recorded.',
    evidenceLocations: [evidencePath, runner, registerPath],
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    runner,
    target: {
      url: evidenceUrl(targetUrl),
      host: targetUrl.hostname,
      path: targetUrl.pathname,
      queryRemoved: true,
    },
    httpResult: result,
    controlsVerified: passed ? [
      'A network-capable runner performed a real HTTPS GET request to /api/health.',
      'The deployment health endpoint returned a successful HTTP status.',
      'The evidence stores status code, duration, content type and host/path only.',
    ] : [
      'Deployment health validation is fail-closed: non-2xx, timeout or network error keeps the P0 row blocked.',
    ],
    githubActions: githubActions(),
    acceptanceCriteria: {
      liveHttpsRequestPerformed: true,
      healthEndpointReturned2xx: passed,
      responseBodyPersisted: false,
      releaseBlockedOnFailure: !passed,
      p0RegisterMayBePromoted: passed,
    },
    exception: passed ? undefined : {
      riskOwner: 'Platform owner',
      rationale: 'Deployment health must be verified from a release runner before production Go.',
      compensatingControls: ['Keep deployment URL functional verification Open until a passing run exists.'],
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

function promoteRegister(evidence) {
  if (!shouldPromote || noWrite || evidence.status !== 'Complete') return;
  const source = readFileSync(registerPath, 'utf8');
  const oldRow = source.split('\n').find((line) => line.startsWith('| Deployment URL functional verification |'));
  if (!oldRow) throw new Error(`${registerPath} missing Deployment URL functional verification row`);
  if (oldRow.includes('| Complete |') && oldRow.includes(evidencePath)) return;
  const newRow = '| Deployment URL functional verification | Complete | `docs/security/evidence/runtime/deployment-health-validation.json` records live HTTPS `/api/health` validation with successful HTTP status, GitHub Actions provenance when available and fail-closed behavior for non-2xx/timeouts/network errors | Platform owner | Revalidate before Go and after every deployment target change |';
  writeFileSync(registerPath, source.replace(oldRow, newRow));
}

async function main() {
  const targetUrl = normalizeTarget(inputUrl);
  const result = await requestHealth(targetUrl);
  const evidence = buildEvidence(targetUrl, result);
  writeEvidence(evidence);
  promoteRegister(evidence);
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
