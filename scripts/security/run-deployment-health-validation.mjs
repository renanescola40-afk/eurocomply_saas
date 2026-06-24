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
  if (url.protocol !== 'https:') throw new Error('Deployment health validation requires https.');
  url.username = '';
  url.password = '';
  url.hash = '';
  url.search = '';
  if (!url.pathname || url.pathname === '/') url.pathname = '/api/health';
  return url;
}

async function assertHealthy(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000);
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'manual', cache: 'no-store', signal: controller.signal });
    await response.arrayBuffer().catch(() => null);
    if (response.status < 200 || response.status >= 300) throw new Error('Health check failed.');
  } catch {
    throw new Error('Health check failed.');
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

function buildEvidence() {
  return {
    schema: 'eurocomply.runtime.deployment-health-validation.v1',
    evidenceItem: 'deployment-health-validation',
    status: 'Complete',
    reviewer: 'EuroComply deployment health automation',
    reviewedAt: now(),
    summary: 'Deployment health validation completed against a live HTTPS deployment URL and /api/health returned a successful HTTP status.',
    evidenceLocations: [evidencePath, runner, registerPath],
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    runner,
    target: {
      url: '[redacted-live-deployment-url]',
      host: '[redacted]',
      path: '/api/health',
      queryRemoved: true,
    },
    healthCheck: {
      outcome: 'passed',
      remoteDetailsPersisted: false,
    },
    controlsVerified: [
      'A network-capable runner performed a real HTTPS GET request to /api/health before this evidence file was written.',
      'The evidence stores only a controlled pass verdict and redacted target metadata.',
    ],
    githubActions: githubActions(),
    acceptanceCriteria: {
      liveHttpsRequestPerformed: true,
      healthEndpointReturned2xx: true,
      releaseBlockedOnFailure: true,
      p0RegisterMayBePromoted: true,
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
  const newRow = '| Deployment URL functional verification | Complete | `docs/security/evidence/runtime/deployment-health-validation.json` records live HTTPS `/api/health` validation with successful HTTP status and release-blocking failure behavior | Platform owner | Revalidate before Go and after every deployment target change |';
  writeFileSync(registerPath, source.replace(oldRow, newRow));
}

async function main() {
  const targetUrl = normalizeTarget(inputUrl);
  await assertHealthy(targetUrl);
  const evidence = buildEvidence();
  writeEvidence(evidence);
  promoteRegister(evidence);
  console.log('Deployment health validation passed for the redacted live deployment target.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
