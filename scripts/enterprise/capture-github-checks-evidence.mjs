#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { latestCreditEligibleRunsByName } from './github-workflow-run-selection.mjs';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const targetSha = process.env.TARGET_SHA;
const outputPath = process.env.GITHUB_CHECKS_EVIDENCE_PATH
  || 'artifacts/enterprise-readiness/github-checks-evidence.json';
const dastEvidencePath = 'docs/security/evidence/p1/dast-automated.json';
const requestedTimeoutMs = Number(process.env.GITHUB_CHECKS_WAIT_MS || 18 * 60 * 1000);
const timeoutMs = process.env.GITHUB_EVENT_NAME === 'pull_request' ? 0 : requestedTimeoutMs;
const pollMs = Number(process.env.GITHUB_CHECKS_POLL_MS || 15_000);
const githubRequestTimeoutMs = Number(process.env.GITHUB_CHECKS_REQUEST_TIMEOUT_MS || 15_000);
const MAX_GITHUB_API_RESPONSE_BYTES = 1024 * 1024;
const GITHUB_RUNS_PAGE_SIZE = 20;
const MAX_GITHUB_RUNS_PAGES = 25;

if (!token || !repository || !/^[0-9a-f]{40}$/i.test(targetSha || '')) {
  console.error('GITHUB_TOKEN, GITHUB_REPOSITORY and a full 40-character TARGET_SHA are required.');
  process.exit(1);
}

if (!Number.isFinite(requestedTimeoutMs) || requestedTimeoutMs < 0) {
  console.error('GITHUB_CHECKS_WAIT_MS must be a non-negative finite number.');
  process.exit(1);
}

if (!Number.isFinite(githubRequestTimeoutMs) || githubRequestTimeoutMs <= 0) {
  console.error('GITHUB_CHECKS_REQUEST_TIMEOUT_MS must be a positive finite number.');
  process.exit(1);
}

const requiredWorkflows = [
  'CI',
  'CodeQL',
  'Semgrep',
  'Secret Scanning',
  'Scan repository for accidental secret exposure',
  'Dependency Review',
  'Actionlint',
  'Public Claims Guard',
  'Full Security Suite',
  'Enterprise Production Gate',
  'RISCK COMPLY Security CI',
  'Enterprise DAST',
  'Dependency Vulnerability Proof',
];

const directWorkflowChecks = {
  codeql: 'CodeQL',
  semgrep: 'Semgrep',
  secretScanning: 'Secret Scanning',
  publicSecretScan: 'Scan repository for accidental secret exposure',
  dependencyReview: 'Dependency Review',
  actionlint: 'Actionlint',
  publicClaims: 'Public Claims Guard',
  fullSecuritySuite: 'Full Security Suite',
  enterpriseProductionGate: 'Enterprise Production Gate',
  securityCi: 'RISCK COMPLY Security CI',
  dast: 'Enterprise DAST',
  npmAudit: 'Dependency Vulnerability Proof',
};

const ciStepChecks = {
  deterministicInstall: [
    'Install dependencies deterministically without lifecycle scripts',
    'Deterministic install',
  ],
  packageLockAligned: ['Package lock alignment gate', 'Package lock alignment'],
  lint: ['Lint'],
  typecheck: ['Typecheck'],
  unitTests: ['Unit tests'],
  build: ['Build'],
  e2e: [
    'E2E tests when runtime is configured',
    'Required production-like Playwright E2E gate',
  ],
  routeQuality: ['Route quality gate', 'Route quality'],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBoundedJsonResponse(response) {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_GITHUB_API_RESPONSE_BYTES) {
      throw new Error('GitHub API response exceeded the 1 MiB limit.');
    }
  }

  if (!response.body) {
    throw new Error('GitHub API response body was missing.');
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_GITHUB_API_RESPONSE_BYTES) {
        await reader.cancel('github_checks_evidence_response_too_large');
        throw new Error('GitHub API response exceeded the 1 MiB limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
  return JSON.parse(text);
}

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'risck-comply-enterprise-scorecard',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(githubRequestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${path}`);
  }

  return readBoundedJsonResponse(response);
}

function latestRunsByName(runs) {
  return latestCreditEligibleRunsByName(runs, { targetSha });
}

function conclusionStatus(conclusion) {
  if (conclusion === 'success') return 'PASS';
  if (['failure', 'timed_out', 'cancelled', 'action_required'].includes(conclusion)) return 'FAIL';
  return 'NOT_VERIFIED';
}

function findStep(jobs, acceptedNames) {
  for (const job of jobs) {
    for (const step of job.steps || []) {
      if (acceptedNames.includes(step.name)) return step;
    }
  }
  return null;
}

async function collectRuns() {
  const encodedSha = encodeURIComponent(targetSha);
  const collectedRuns = [];

  for (let page = 1; page <= MAX_GITHUB_RUNS_PAGES; page += 1) {
    const payload = await github(
      `/repos/${repository}/actions/runs?head_sha=${encodedSha}&exclude_pull_requests=true&per_page=${GITHUB_RUNS_PAGE_SIZE}&page=${page}`,
    );
    const pageRuns = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
    collectedRuns.push(...pageRuns);

    const selected = latestRunsByName(collectedRuns);
    if (requiredWorkflows.every((name) => selected.has(name))) return selected;

    const totalCount = Number(payload.total_count);
    if (pageRuns.length < GITHUB_RUNS_PAGE_SIZE) break;
    if (Number.isFinite(totalCount) && collectedRuns.length >= totalCount) break;
  }

  return latestRunsByName(collectedRuns);
}

const deadline = Date.now() + timeoutMs;
let runs = new Map();

while (Date.now() < deadline) {
  runs = await collectRuns();
  const complete = requiredWorkflows.every((name) => runs.get(name)?.status === 'completed');
  if (complete) break;
  await sleep(pollMs);
}

const checks = [];
const runMetadata = [];

for (const [checkName, workflowName] of Object.entries(directWorkflowChecks)) {
  const run = runs.get(workflowName);
  checks.push({
    name: checkName,
    status: run ? conclusionStatus(run.conclusion) : 'NOT_VERIFIED',
    workflow: workflowName,
    runId: run?.id ?? null,
  });
}

const ciRun = runs.get('CI');
let ciJobs = [];
if (ciRun) {
  const jobsPayload = await github(`/repos/${repository}/actions/runs/${ciRun.id}/jobs?per_page=100`);
  ciJobs = jobsPayload.jobs || [];
}

for (const [checkName, stepNames] of Object.entries(ciStepChecks)) {
  const step = findStep(ciJobs, stepNames);
  checks.push({
    name: checkName,
    status: step ? conclusionStatus(step.conclusion) : 'NOT_VERIFIED',
    workflow: 'CI',
    runId: ciRun?.id ?? null,
    step: step?.name ?? null,
  });
}

for (const workflowName of requiredWorkflows) {
  const run = runs.get(workflowName);
  runMetadata.push({
    workflow: workflowName,
    runId: run?.id ?? null,
    status: run?.status ?? 'missing',
    conclusion: run?.conclusion ?? null,
    headSha: run?.head_sha ?? null,
  });
}

const allRequiredPassed = requiredWorkflows.every(
  (name) => runs.get(name)?.status === 'completed' && runs.get(name)?.conclusion === 'success',
);
checks.push({
  name: 'requiredChecks',
  status: allRequiredPassed ? 'PASS' : 'NOT_VERIFIED',
  workflow: 'aggregate',
  runId: null,
});

const evidence = {
  schema: 'risck-comply.github-checks-evidence.v1',
  status: allRequiredPassed ? 'Complete' : 'Open',
  outcome: allRequiredPassed ? 'passed' : 'not_verified',
  generatedFromRealEvidence: true,
  source: 'github-actions-api',
  repository,
  targetSha,
  generatedAt: new Date().toISOString(),
  checks,
  workflowRuns: runMetadata,
  limitations: [
    'This artifact proves repository and CI checks for one exact SHA.',
    'Pull-request scorecard diagnostics do not poll protected main-only workflow history; absent main proof is represented as NOT_VERIFIED without delay or PASS credit.',
    'A no-op Enterprise Production Gate run whose workflow_run source failed and therefore skipped every gate job is ignored for latest-run selection; the latest real evaluation for the exact SHA remains authoritative.',
    'The npmAudit result comes from the dedicated exact-SHA dependency vulnerability workflow.',
    'It does not prove production deployment, provider health, customer login, tenant isolation, rollback or restore.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });

const dastRun = runs.get('Enterprise DAST');
const dastPassed = dastRun?.status === 'completed'
  && dastRun?.conclusion === 'success'
  && dastRun?.head_sha === targetSha;
const dastEvidence = {
  schema: 'risck-comply.dast-automated-evidence.v1',
  evidenceItem: 'dast-automated',
  status: dastPassed ? 'Complete' : 'Open',
  outcome: dastPassed ? 'passed' : 'not_verified',
  repository,
  targetSha,
  generatedAt: new Date().toISOString(),
  source: 'github-actions-api',
  workflow: 'Enterprise DAST',
  workflowRunId: dastRun?.id ?? null,
  checks: [
    { name: 'exactSha', passed: dastRun?.head_sha === targetSha },
    { name: 'workflowCompleted', passed: dastRun?.status === 'completed' },
    { name: 'highRiskAlertsAbsent', passed: dastRun?.conclusion === 'success' },
  ],
  evidenceIntegrity: {
    exactShaBound: dastRun?.head_sha === targetSha,
    rawHttpTrafficStored: false,
    responseBodiesStored: false,
    credentialsStored: false,
    customerDataStored: false,
  },
  evidenceBoundary: 'OWASP ZAP Baseline scanned the production-like application built from the exact assessed SHA. The gate fails on High-risk alerts. It does not prove authenticated coverage, production infrastructure behavior, business-logic abuse resistance, penetration testing or absence of every vulnerability.',
};
mkdirSync(dirname(dastEvidencePath), { recursive: true });
writeFileSync(dastEvidencePath, `${JSON.stringify(dastEvidence, null, 2)}\n`, { mode: 0o600 });

console.log(`Captured ${checks.filter((item) => item.status === 'PASS').length}/${checks.length} exact-SHA checks.`);
console.log(`Evidence: ${outputPath}`);
console.log(`DAST evidence: ${dastEvidencePath} (${dastEvidence.status})`);
