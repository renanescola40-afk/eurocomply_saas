#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const targetSha = process.env.TARGET_SHA;
const outputPath = process.env.GITHUB_CHECKS_EVIDENCE_PATH
  || 'artifacts/enterprise-readiness/github-checks-evidence.json';
const timeoutMs = Number(process.env.GITHUB_CHECKS_WAIT_MS || 18 * 60 * 1000);
const pollMs = Number(process.env.GITHUB_CHECKS_POLL_MS || 15_000);

if (!token || !repository || !/^[0-9a-f]{40}$/i.test(targetSha || '')) {
  console.error('GITHUB_TOKEN, GITHUB_REPOSITORY and a full 40-character TARGET_SHA are required.');
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
  npmAudit: ['npm audit moderate gate', 'npm audit'],
  routeQuality: ['Route quality gate', 'Route quality'],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'risck-comply-enterprise-scorecard',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${path}`);
  }

  return response.json();
}

function latestRunsByName(runs) {
  const selected = new Map();
  for (const run of runs) {
    if (run.head_sha !== targetSha) continue;
    const existing = selected.get(run.name);
    if (!existing || new Date(run.created_at) > new Date(existing.created_at)) {
      selected.set(run.name, run);
    }
  }
  return selected;
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
  const payload = await github(`/repos/${repository}/actions/runs?head_sha=${encodedSha}&per_page=100`);
  return latestRunsByName(payload.workflow_runs || []);
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
    'It does not prove production deployment, provider health, customer login, tenant isolation, rollback or restore.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });

console.log(`Captured ${checks.filter((item) => item.status === 'PASS').length}/${checks.length} exact-SHA checks.`);
console.log(`Evidence: ${outputPath}`);
