import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PRODUCER_WORKFLOW_NAMES = Object.freeze([
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
  'Distributed Rate Limit Runtime Proof',
  'Auth RBAC Tenant Proof',
  'Supabase Live RLS Validation',
  'Production Runtime Proof',
  'Branch Protection Runtime Proof',
  'Final Technical Controls Proof',
  'Recovery Resilience Proof',
]);

export const SCORECARD_WORKFLOW_NAME = 'Enterprise Readiness Scorecard';
export const SCORECARD_WORKFLOW_PATH = 'enterprise-readiness-scorecard.yml';
export const ACTIVE_RUN_STATUSES = new Set([
  'queued',
  'in_progress',
  'waiting',
  'requested',
  'pending',
]);

const API_VERSION = '2022-11-28';
const PER_PAGE = 100;
const MAX_RUN_PAGES = 3;
const MAX_SETTLE_ATTEMPTS = 10;
const SETTLE_INTERVAL_MS = 30_000;
const QUIET_WINDOW_MS = 75_000;

function timestampMs(run) {
  const value = run.updated_at ?? run.run_started_at ?? run.created_at;
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function createdTimestampMs(run) {
  const parsed = Date.parse(run?.created_at ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function exactShaProducerRuns(runs, targetSha) {
  const names = new Set(PRODUCER_WORKFLOW_NAMES);
  return runs.filter(
    (run) => run?.head_sha === targetSha && names.has(run?.name),
  );
}

export function latestProducerTimestamp(runs) {
  return runs.reduce((latest, run) => Math.max(latest, timestampMs(run)), 0);
}

export function hasActiveProducer(runs) {
  return runs.some((run) => ACTIVE_RUN_STATUSES.has(run?.status));
}

export function scorecardAlreadyCoversEvidence(runs, targetSha, producerCutoffMs) {
  return runs.some((run) => {
    if (run?.head_sha !== targetSha || run?.name !== SCORECARD_WORKFLOW_NAME) return false;
    if (createdTimestampMs(run) < producerCutoffMs) return false;
    if (ACTIVE_RUN_STATUSES.has(run?.status)) return true;
    return run?.status === 'completed' && run?.conclusion === 'success';
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateSha(value) {
  if (!/^[0-9a-f]{40}$/.test(value ?? '')) {
    throw new Error('TARGET_SHA must be a lowercase 40-character Git SHA');
  }
  return value;
}

function validateRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value ?? '')) {
    throw new Error('GITHUB_REPOSITORY is invalid');
  }
  return value;
}

function writeOutput(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (output) appendFileSync(output, `${name}=${String(value)}\n`);
}

async function githubApi(path, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');

  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'risck-comply-scorecard-stabilizer',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const requestId = response.headers.get('x-github-request-id') ?? 'unavailable';
    throw new Error(`GitHub API ${method} ${path} failed with ${response.status}; request-id=${requestId}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function listExactShaRuns(repository, targetSha) {
  const encodedSha = encodeURIComponent(targetSha);
  const allRuns = [];
  let totalCount = 0;

  for (let page = 1; page <= MAX_RUN_PAGES; page += 1) {
    const result = await githubApi(
      `/repos/${repository}/actions/runs?head_sha=${encodedSha}&per_page=${PER_PAGE}&page=${page}`,
    );
    const pageRuns = Array.isArray(result?.workflow_runs) ? result.workflow_runs : [];
    totalCount = Number(result?.total_count ?? pageRuns.length);
    allRuns.push(...pageRuns);
    if (allRuns.length >= totalCount || pageRuns.length < PER_PAGE) break;
  }

  if (allRuns.length < totalCount) {
    throw new Error(
      `Exact-SHA run inventory exceeds bounded pagination (${allRuns.length}/${totalCount}); refusing to dispatch`,
    );
  }

  return allRuns;
}

async function currentMainSha(repository) {
  const result = await githubApi(`/repos/${repository}/git/ref/heads/main`);
  return result?.object?.sha ?? '';
}

async function dispatchScorecard(repository) {
  await githubApi(
    `/repos/${repository}/actions/workflows/${SCORECARD_WORKFLOW_PATH}/dispatches`,
    { method: 'POST', body: { ref: 'main' } },
  );
}

export async function stabilize({ now = () => Date.now() } = {}) {
  const repository = validateRepository(process.env.GITHUB_REPOSITORY);
  const targetSha = validateSha(process.env.TARGET_SHA);
  let settledRuns = null;
  let producerCutoffMs = 0;

  for (let attempt = 1; attempt <= MAX_SETTLE_ATTEMPTS; attempt += 1) {
    const runs = await listExactShaRuns(repository, targetSha);
    const producers = exactShaProducerRuns(runs, targetSha);

    if (producers.length === 0 || hasActiveProducer(producers)) {
      if (attempt < MAX_SETTLE_ATTEMPTS) await sleep(SETTLE_INTERVAL_MS);
      continue;
    }

    producerCutoffMs = latestProducerTimestamp(producers);
    const quietForMs = now() - producerCutoffMs;
    if (producerCutoffMs === 0 || quietForMs < QUIET_WINDOW_MS) {
      if (attempt < MAX_SETTLE_ATTEMPTS) {
        await sleep(Math.min(SETTLE_INTERVAL_MS, Math.max(1_000, QUIET_WINDOW_MS - quietForMs)));
      }
      continue;
    }

    settledRuns = runs;
    break;
  }

  if (!settledRuns) {
    throw new Error('Material evidence producers did not reach a bounded quiet terminal state');
  }

  const mainSha = await currentMainSha(repository);
  if (mainSha !== targetSha) {
    writeOutput('dispatched', false);
    writeOutput('reason', 'main-advanced');
    writeOutput('target_sha', targetSha);
    return { dispatched: false, reason: 'main-advanced', targetSha };
  }

  const refreshedRuns = await listExactShaRuns(repository, targetSha);
  const refreshedProducers = exactShaProducerRuns(refreshedRuns, targetSha);
  if (hasActiveProducer(refreshedProducers)) {
    throw new Error('A material evidence producer became active after the quiet-state check; refusing to dispatch');
  }

  producerCutoffMs = latestProducerTimestamp(refreshedProducers);
  if (scorecardAlreadyCoversEvidence(refreshedRuns, targetSha, producerCutoffMs)) {
    writeOutput('dispatched', false);
    writeOutput('reason', 'scorecard-current');
    writeOutput('target_sha', targetSha);
    return { dispatched: false, reason: 'scorecard-current', targetSha };
  }

  await dispatchScorecard(repository);
  writeOutput('dispatched', true);
  writeOutput('reason', 'terminal-dispatch');
  writeOutput('target_sha', targetSha);
  return { dispatched: true, reason: 'terminal-dispatch', targetSha };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  stabilize()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
