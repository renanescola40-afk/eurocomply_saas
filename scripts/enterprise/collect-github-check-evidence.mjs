#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUTPUT_PATH =
  process.env.ENTERPRISE_GITHUB_EVIDENCE_PATH ||
  'artifacts/enterprise-readiness/github-checks-evidence.json';

const REQUIRED_WORKFLOWS = Object.freeze({
  CI: 'ci',
  CodeQL: 'codeql',
  Semgrep: 'semgrep',
  Gitleaks: 'gitleaks',
  'Secret Scanning': 'secretScanning',
  'Dependency Review': 'dependencyReview',
  Actionlint: 'actionlint',
  'RISCK COMPLY Security CI': 'securityCi',
  'RISCK COMPLY Upload Security CI': 'uploadSecurityCi',
  'Full Security Suite': 'fullSecuritySuite',
  'Enterprise Production Gate': 'enterpriseProductionGate',
  'Scan repository for accidental secret exposure': 'publicSecretScan',
});

const CI_STEP_CHECKS = Object.freeze({
  'Install dependencies deterministically without lifecycle scripts': 'deterministicInstall',
  'Package lock alignment gate': 'packageLockAligned',
  Lint: 'lint',
  Typecheck: 'typecheck',
  'Unit tests': 'unitTests',
  Build: 'build',
  'E2E tests when runtime is configured': 'e2e',
  'npm audit moderate gate': 'npmAudit',
  'Route quality gate': 'routeQuality',
});

export function normalizeConclusion(conclusion) {
  if (conclusion === 'success') return { status: 'Complete', outcome: 'passed', passed: true };
  if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled') {
    return { status: 'Failed', outcome: 'failed', passed: false };
  }
  if (conclusion === 'skipped' || conclusion === 'neutral' || conclusion === 'action_required') {
    return { status: 'Open', outcome: 'not_verified' };
  }
  return { status: 'Open', outcome: 'not_verified' };
}

export function latestRunsByName(runs) {
  const selected = new Map();
  for (const run of runs) {
    if (!run?.name || !Object.hasOwn(REQUIRED_WORKFLOWS, run.name)) continue;
    const current = selected.get(run.name);
    const attempt = Number(run.run_attempt ?? 1);
    const currentAttempt = Number(current?.run_attempt ?? 0);
    const createdAt = Date.parse(run.created_at ?? 0);
    const currentCreatedAt = Date.parse(current?.created_at ?? 0);
    if (!current || attempt > currentAttempt || (attempt === currentAttempt && createdAt > currentCreatedAt)) {
      selected.set(run.name, run);
    }
  }
  return selected;
}

export function findStepConclusion(jobs, stepName) {
  for (const job of jobs) {
    for (const step of job?.steps ?? []) {
      if (step?.name === stepName) return step.conclusion ?? null;
    }
  }
  return null;
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-enterprise-readiness',
  };
}

async function requestJson(url, token) {
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}) for ${new URL(url).pathname}`);
  }
  return response.json();
}

async function listRuns({ repository, targetSha, token }) {
  const url = new URL(`https://api.github.com/repos/${repository}/actions/runs`);
  url.searchParams.set('head_sha', targetSha);
  url.searchParams.set('per_page', '100');
  const payload = await requestJson(url, token);
  return payload.workflow_runs ?? [];
}

async function listJobs({ repository, runId, token }) {
  const payload = await requestJson(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs?filter=latest&per_page=100`,
    token,
  );
  return payload.jobs ?? [];
}

function terminal(run) {
  return run?.status === 'completed' && Boolean(run?.conclusion);
}

async function waitForRequiredRuns(options) {
  const timeoutMs = Number(process.env.ENTERPRISE_GITHUB_EVIDENCE_TIMEOUT_MS || 1_200_000);
  const pollMs = Number(process.env.ENTERPRISE_GITHUB_EVIDENCE_POLL_MS || 15_000);
  const startedAt = Date.now();

  while (true) {
    const runs = await listRuns(options);
    const selected = latestRunsByName(runs);
    const pending = Object.keys(REQUIRED_WORKFLOWS).filter((name) => !terminal(selected.get(name)));
    if (pending.length === 0) return selected;
    if (Date.now() - startedAt >= timeoutMs) {
      return selected;
    }
    console.log(`Waiting for exact-SHA workflows: ${pending.join(', ')}`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export function buildEvidenceDocument({ targetSha, selectedRuns, ciJobs = [] }) {
  const checks = [];
  let allRequiredPassed = true;

  for (const [workflowName, checkName] of Object.entries(REQUIRED_WORKFLOWS)) {
    const run = selectedRuns.get(workflowName);
    const result = normalizeConclusion(run?.conclusion ?? null);
    if (result.passed !== true) allRequiredPassed = false;
    checks.push({
      name: checkName,
      ...result,
      source: 'github_actions_workflow',
      workflow: workflowName,
      runId: run?.id ?? null,
      targetSha,
    });
  }

  for (const [stepName, checkName] of Object.entries(CI_STEP_CHECKS)) {
    const result = normalizeConclusion(findStepConclusion(ciJobs, stepName));
    checks.push({
      name: checkName,
      ...result,
      source: 'github_actions_step',
      workflow: 'CI',
      step: stepName,
      targetSha,
    });
  }

  checks.push({
    name: 'requiredChecks',
    status: allRequiredPassed ? 'Complete' : 'Open',
    outcome: allRequiredPassed ? 'passed' : 'not_verified',
    passed: allRequiredPassed || undefined,
    source: 'github_actions_aggregate',
    targetSha,
  });

  const failures = checks.filter((check) => check.passed === false).map((check) => check.name);
  const unverified = checks
    .filter((check) => check.passed !== true && check.passed !== false)
    .map((check) => check.name);

  return {
    schema: 'risck-comply.github-check-evidence.v1',
    status: failures.length > 0 ? 'Failed' : unverified.length > 0 ? 'Open' : 'Complete',
    outcome: failures.length > 0 ? 'failed' : unverified.length > 0 ? 'not_verified' : 'passed',
    generatedFromRealEvidence: true,
    evidenceScope: 'repository_ci_only',
    targetSha,
    collectedAt: new Date().toISOString(),
    failures,
    unverified,
    checks,
    limitations: [
      'This evidence proves GitHub repository checks for one exact SHA only.',
      'It does not prove production deployment, runtime health, providers, tenant isolation, rollback or restore.',
    ],
  };
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const targetSha = process.env.TARGET_SHA;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  if (!repository) throw new Error('GITHUB_REPOSITORY is required');
  if (!/^[a-f0-9]{40}$/i.test(targetSha ?? '')) throw new Error('TARGET_SHA must be a full 40-character Git SHA');

  const selectedRuns = await waitForRequiredRuns({ repository, targetSha, token });
  const ciRun = selectedRuns.get('CI');
  const ciJobs = ciRun ? await listJobs({ repository, runId: ciRun.id, token }) : [];
  const evidence = buildEvidenceDocument({ targetSha, selectedRuns, ciJobs });

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Exact-SHA GitHub evidence written to ${OUTPUT_PATH}`);
  console.log(`Status: ${evidence.status}; failures=${evidence.failures.length}; unverified=${evidence.unverified.length}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Unable to collect GitHub check evidence');
    process.exit(1);
  });
}
