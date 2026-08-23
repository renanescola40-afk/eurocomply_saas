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
  'RISCK COMPLY Upload Security CI',
  'Enterprise DAST',
  'Dependency Vulnerability Proof',
  'Distributed Rate Limit Runtime Proof',
  'Auth RBAC Tenant Proof',
  'Supabase Live RLS Validation',
  'Production Runtime Proof',
  'Audit Chain Runtime Proof',
  'Production Provider Runtime Proof',
  'Branch Protection Runtime Proof',
  'Step-Up Runtime Proof',
  'Stripe Runtime Evidence Promotion',
  'Public Production Final',
  'Final Technical Controls Proof',
  'Recovery Resilience Proof',
  'Enterprise Recovery Drill',
]);

export const ENTERPRISE_PRODUCTION_GATE_NAME = 'Enterprise Production Gate';
export const ENTERPRISE_PRODUCTION_GATE_PATH = 'enterprise-production-gate.yml';
export const SCORECARD_WORKFLOW_NAME = 'Enterprise Readiness Scorecard';
export const SCORECARD_WORKFLOW_PATH = 'enterprise-readiness-scorecard.yml';
export const ACTIVE_RUN_STATUSES = new Set([
  'queued',
  'in_progress',
  'waiting',
  'requested',
  'pending',
]);
export const TERMINAL_EVALUATION_CONCLUSIONS = new Set(['success', 'failure']);

const API_VERSION = '2022-11-28';
const PER_PAGE = 100;
const MAX_RUN_PAGES = 5;
const MAX_SETTLE_ATTEMPTS = 10;
const MAX_GATE_SETTLE_ATTEMPTS = 80;
const SETTLE_INTERVAL_MS = 30_000;
const GATE_SETTLE_INTERVAL_MS = 15_000;
const QUIET_WINDOW_MS = 75_000;
const MAX_API_ATTEMPTS = 5;
const API_BACKOFF_BASE_MS = 2_000;
const API_BACKOFF_CAP_MS = 30_000;

function timestampMs(run) {
  const value = run.updated_at ?? run.run_started_at ?? run.created_at;
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function createdTimestampMs(run) {
  const parsed = Date.parse(run?.created_at ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isTerminalEvaluation(run) {
  return run?.status === 'completed' && TERMINAL_EVALUATION_CONCLUSIONS.has(run?.conclusion);
}

export function relevantProductionGateRuns(runs, targetSha, producerCutoffMs) {
  return runs
    .filter((run) => run?.head_sha === targetSha && run?.name === ENTERPRISE_PRODUCTION_GATE_NAME)
    .filter((run) => createdTimestampMs(run) >= producerCutoffMs)
    .filter((run) => ACTIVE_RUN_STATUSES.has(run?.status) || isTerminalEvaluation(run))
    .sort((a, b) => createdTimestampMs(b) - createdTimestampMs(a));
}

export function exactShaProducerRuns(runs, targetSha) {
  const names = new Set(PRODUCER_WORKFLOW_NAMES);
  return runs.filter(
    (run) => run?.head_sha === targetSha && names.has(run?.name),
  );
}

export function exactShaUpstreamProducerRuns(runs, targetSha) {
  return exactShaProducerRuns(runs, targetSha).filter(
    (run) => run?.name !== ENTERPRISE_PRODUCTION_GATE_NAME,
  );
}

export function latestProducerTimestamp(runs) {
  return runs.reduce((latest, run) => Math.max(latest, timestampMs(run)), 0);
}

export function hasActiveProducer(runs) {
  return runs.some((run) => ACTIVE_RUN_STATUSES.has(run?.status));
}

export function productionGateAlreadyCoversEvidence(runs, targetSha, producerCutoffMs) {
  return relevantProductionGateRuns(runs, targetSha, producerCutoffMs).length > 0;
}

export function scorecardAlreadyCoversEvidence(runs, targetSha, producerCutoffMs) {
  return runs.some((run) => {
    if (run?.head_sha !== targetSha || run?.name !== SCORECARD_WORKFLOW_NAME) return false;
    if (createdTimestampMs(run) < producerCutoffMs) return false;
    if (ACTIVE_RUN_STATUSES.has(run?.status)) return true;
    return isTerminalEvaluation(run);
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

function boundedRetryDelayMs(response, attempt) {
  const exponential = Math.min(
    API_BACKOFF_CAP_MS,
    API_BACKOFF_BASE_MS * (2 ** Math.max(0, attempt - 1)),
  );
  const retryAfterSeconds = Number(response.headers.get('retry-after') ?? 0);
  const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds * 1_000
    : 0;
  const resetSeconds = Number(response.headers.get('x-ratelimit-reset') ?? 0);
  const resetMs = Number.isFinite(resetSeconds) && resetSeconds > 0
    ? Math.max(0, (resetSeconds * 1_000) - Date.now())
    : 0;

  return Math.min(
    API_BACKOFF_CAP_MS,
    Math.max(exponential, retryAfterMs, resetMs),
  );
}

function isRetryableStatus(status) {
  return status === 403 || status === 429 || status >= 500;
}

async function githubApi(path, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');

  for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt += 1) {
    let response;
    try {
      response = await fetch(`https://api.github.com${path}`, {
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
    } catch (error) {
      if (attempt >= MAX_API_ATTEMPTS) {
        throw new Error(
          `GitHub API ${method} ${path} failed after ${attempt} network attempts: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const delayMs = Math.min(
        API_BACKOFF_CAP_MS,
        API_BACKOFF_BASE_MS * (2 ** Math.max(0, attempt - 1)),
      );
      console.warn(`GitHub API ${method} ${path} network retry ${attempt}/${MAX_API_ATTEMPTS} in ${delayMs}ms`);
      await sleep(delayMs);
      continue;
    }

    if (response.ok) {
      if (response.status === 204) return null;
      return response.json();
    }

    const requestId = response.headers.get('x-github-request-id') ?? 'unavailable';
    const remaining = response.headers.get('x-ratelimit-remaining') ?? 'unknown';
    const retryable = isRetryableStatus(response.status);
    if (!retryable || attempt >= MAX_API_ATTEMPTS) {
      throw new Error(
        `GitHub API ${method} ${path} failed with ${response.status}; request-id=${requestId}; rate-remaining=${remaining}; attempts=${attempt}`,
      );
    }

    const delayMs = boundedRetryDelayMs(response, attempt);
    console.warn(
      `GitHub API ${method} ${path} returned ${response.status}; retry ${attempt}/${MAX_API_ATTEMPTS} in ${delayMs}ms; request-id=${requestId}; rate-remaining=${remaining}`,
    );
    await sleep(delayMs);
  }

  throw new Error(`GitHub API ${method} ${path} exhausted retry loop unexpectedly`);
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

async function dispatchWorkflow(repository, workflowPath) {
  await githubApi(
    `/repos/${repository}/actions/workflows/${workflowPath}/dispatches`,
    { method: 'POST', body: { ref: 'main' } },
  );
}

async function dispatchProductionGate(repository) {
  await dispatchWorkflow(repository, ENTERPRISE_PRODUCTION_GATE_PATH);
}

async function dispatchScorecard(repository) {
  await dispatchWorkflow(repository, SCORECARD_WORKFLOW_PATH);
}

async function waitForTerminalProductionGate(
  repository,
  targetSha,
  producerCutoffMs,
  { refreshAlreadyDispatched = false } = {},
) {

  for (let attempt = 1; attempt <= MAX_GATE_SETTLE_ATTEMPTS; attempt += 1) {
    const runs = await listExactShaRuns(repository, targetSha);
    const latest = relevantProductionGateRuns(runs, targetSha, producerCutoffMs)[0];
    if (isTerminalEvaluation(latest)) return latest;
    if (attempt < MAX_GATE_SETTLE_ATTEMPTS) await sleep(GATE_SETTLE_INTERVAL_MS);
  }
  throw new Error('Terminal Enterprise Production Gate did not complete within the bounded settlement window');
}

export async function stabilize({ now = () => Date.now() } = {}) {
  const repository = validateRepository(process.env.GITHUB_REPOSITORY);
  const targetSha = validateSha(process.env.TARGET_SHA);
  let settledRuns = null;
  let upstreamCutoffMs = 0;

  for (let attempt = 1; attempt <= MAX_SETTLE_ATTEMPTS; attempt += 1) {
    const runs = await listExactShaRuns(repository, targetSha);
    const upstreamProducers = exactShaUpstreamProducerRuns(runs, targetSha);

    if (upstreamProducers.length === 0 || hasActiveProducer(upstreamProducers)) {
      if (attempt < MAX_SETTLE_ATTEMPTS) await sleep(SETTLE_INTERVAL_MS);
      continue;
    }

    upstreamCutoffMs = latestProducerTimestamp(upstreamProducers);
    const quietForMs = now() - upstreamCutoffMs;
    if (upstreamCutoffMs === 0 || quietForMs < QUIET_WINDOW_MS) {
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

  let mainSha = await currentMainSha(repository);
  if (mainSha !== targetSha) {
    writeOutput('dispatched', false);
    writeOutput('reason', 'main-advanced');
    writeOutput('target_sha', targetSha);
    return { dispatched: false, reason: 'main-advanced', targetSha };
  }

  let refreshedRuns = await listExactShaRuns(repository, targetSha);
  let refreshedUpstream = exactShaUpstreamProducerRuns(refreshedRuns, targetSha);
  if (hasActiveProducer(refreshedUpstream)) {
    throw new Error('A material evidence producer became active after the quiet-state check; refusing to dispatch');
  }

  upstreamCutoffMs = latestProducerTimestamp(refreshedUpstream);
  let productionGateRefreshDispatched = false;
  if (!productionGateAlreadyCoversEvidence(refreshedRuns, targetSha, upstreamCutoffMs)) {
    mainSha = await currentMainSha(repository);
    if (mainSha !== targetSha) {
      writeOutput('dispatched', false);
      writeOutput('reason', 'main-advanced');
      writeOutput('target_sha', targetSha);
      return { dispatched: false, reason: 'main-advanced', targetSha };
    }

    await dispatchProductionGate(repository);
    productionGateRefreshDispatched = true;
  }

  await waitForTerminalProductionGate(repository, targetSha, upstreamCutoffMs, {
    refreshAlreadyDispatched: productionGateRefreshDispatched,
  });

  refreshedRuns = await listExactShaRuns(repository, targetSha);
  refreshedUpstream = exactShaUpstreamProducerRuns(refreshedRuns, targetSha);
  if (hasActiveProducer(refreshedUpstream)) {
    throw new Error('A material evidence producer became active while the production gate was settling; refusing to dispatch');
  }

  upstreamCutoffMs = latestProducerTimestamp(refreshedUpstream);
  const terminalGate = refreshedRuns
    .filter((run) => run?.name === ENTERPRISE_PRODUCTION_GATE_NAME)
    .filter((run) => isTerminalEvaluation(run))
    .filter((run) => createdTimestampMs(run) >= upstreamCutoffMs)
    .sort((a, b) => createdTimestampMs(b) - createdTimestampMs(a))[0];

  if (!terminalGate) {
    throw new Error('No terminal Enterprise Production Gate evaluation covers the latest material producer state');
  }

  mainSha = await currentMainSha(repository);
  if (mainSha !== targetSha) {
    writeOutput('dispatched', false);
    writeOutput('reason', 'main-advanced');
    writeOutput('target_sha', targetSha);
    return { dispatched: false, reason: 'main-advanced', targetSha };
  }

  const allProducers = exactShaProducerRuns(refreshedRuns, targetSha);
  const producerCutoffMs = latestProducerTimestamp(allProducers);
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
      writeOutput('dispatched', false);
      writeOutput('reason', 'stabilizer-error');
      writeOutput('target_sha', process.env.TARGET_SHA ?? '');
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}