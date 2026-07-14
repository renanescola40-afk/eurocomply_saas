#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUTPUT = process.env.ENTERPRISE_GITHUB_EVIDENCE_PATH || 'artifacts/enterprise-readiness/github-checks-evidence.json';
const TARGET_SHA = process.env.TARGET_SHA;
const REPOSITORY = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;

const WORKFLOWS = {
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
};

const CI_STEPS = {
  'Install dependencies deterministically without lifecycle scripts': 'deterministicInstall',
  'Package lock alignment gate': 'packageLockAligned',
  Lint: 'lint',
  Typecheck: 'typecheck',
  'Unit tests': 'unitTests',
  Build: 'build',
  'E2E tests when runtime is configured': 'e2e',
  'npm audit moderate gate': 'npmAudit',
  'Route quality gate': 'routeQuality',
};

export function normalizeConclusion(value) {
  if (value === 'success') return { status: 'Complete', outcome: 'passed', passed: true };
  if (['failure', 'timed_out', 'cancelled'].includes(value)) return { status: 'Failed', outcome: 'failed', passed: false };
  return { status: 'Open', outcome: 'not_verified' };
}

export function latestRunsByName(runs) {
  const selected = new Map();
  for (const run of runs) {
    if (!run?.name || !Object.hasOwn(WORKFLOWS, run.name)) continue;
    const current = selected.get(run.name);
    if (!current || Number(run.run_attempt ?? 1) > Number(current.run_attempt ?? 1) || Date.parse(run.created_at ?? 0) > Date.parse(current.created_at ?? 0)) {
      selected.set(run.name, run);
    }
  }
  return selected;
}

export function findStepConclusion(jobs, name) {
  for (const job of jobs) {
    const step = (job.steps ?? []).find((item) => item?.name === name);
    if (step) return step.conclusion ?? null;
  }
  return null;
}

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-enterprise-readiness',
  };
}

async function request(url) {
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) throw new Error(`GitHub API request failed with ${response.status}`);
  return response.json();
}

async function listRuns() {
  const url = new URL(`https://api.github.com/repos/${REPOSITORY}/actions/runs`);
  url.searchParams.set('head_sha', TARGET_SHA);
  url.searchParams.set('per_page', '100');
  return (await request(url)).workflow_runs ?? [];
}

async function waitForRuns() {
  const deadline = Date.now() + Number(process.env.ENTERPRISE_GITHUB_EVIDENCE_TIMEOUT_MS || 1_200_000);
  while (true) {
    const selected = latestRunsByName(await listRuns());
    const pending = Object.keys(WORKFLOWS).filter((name) => selected.get(name)?.status !== 'completed');
    if (pending.length === 0 || Date.now() >= deadline) return selected;
    console.log(`Waiting for exact-SHA workflows: ${pending.join(', ')}`);
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

async function listJobs(runId) {
  return (await request(`https://api.github.com/repos/${REPOSITORY}/actions/runs/${runId}/jobs?filter=latest&per_page=100`)).jobs ?? [];
}

export function buildEvidenceDocument({ targetSha, selectedRuns, ciJobs }) {
  const checks = [];
  for (const [workflow, name] of Object.entries(WORKFLOWS)) {
    const run = selectedRuns.get(workflow);
    checks.push({ name, ...normalizeConclusion(run?.conclusion), source: 'github_actions_workflow', workflow, runId: run?.id ?? null, targetSha });
  }
  for (const [step, name] of Object.entries(CI_STEPS)) {
    checks.push({ name, ...normalizeConclusion(findStepConclusion(ciJobs, step)), source: 'github_actions_step', workflow: 'CI', step, targetSha });
  }
  const requiredChecksPassed = checks.filter((item) => item.source === 'github_actions_workflow').every((item) => item.passed === true);
  checks.push({ name: 'requiredChecks', ...normalizeConclusion(requiredChecksPassed ? 'success' : null), source: 'github_actions_aggregate', targetSha });
  const failures = checks.filter((item) => item.passed === false).map((item) => item.name);
  const unverified = checks.filter((item) => item.passed !== true && item.passed !== false).map((item) => item.name);
  return {
    schema: 'risck-comply.github-check-evidence.v1',
    status: failures.length ? 'Failed' : unverified.length ? 'Open' : 'Complete',
    outcome: failures.length ? 'failed' : unverified.length ? 'not_verified' : 'passed',
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
  if (!TOKEN || !REPOSITORY) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  if (!/^[a-f0-9]{40}$/i.test(TARGET_SHA ?? '')) throw new Error('TARGET_SHA must be a full 40-character SHA');
  const selectedRuns = await waitForRuns();
  const ciRun = selectedRuns.get('CI');
  const evidence = buildEvidenceDocument({ targetSha: TARGET_SHA, selectedRuns, ciJobs: ciRun ? await listJobs(ciRun.id) : [] });
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Exact-SHA repository evidence: ${evidence.status}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unable to collect GitHub evidence');
  process.exit(1);
});
