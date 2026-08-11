#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProductionSecretsRuntimeEvidence } from '../release/validate-production-secrets-runtime-evidence.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'production-provider-runtime-proof.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;
const EVIDENCE_PATH = 'docs/security/evidence/runtime/production-secrets-provider-stores.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-provider-evidence-fetcher',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: headers(token),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.path === WORKFLOW_PATH)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => new Set(['push', 'workflow_dispatch']).has(run?.event))
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((a, b) => Date.parse(b?.updated_at || b?.created_at || 0) - Date.parse(a?.updated_at || a?.created_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha, repository, now = new Date() }) {
  const failures = validateProductionSecretsRuntimeEvidence(evidence, {
    now,
    expectedCommitSha: targetSha,
    expectedRepository: repository,
    expectedBranch: 'main',
  });
  return { passed: failures.length === 0, failures };
}

function escapeCurl(value) {
  return String(value).replace(/[\r\n]/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function downloadArtifact(repository, token, artifactId, output) {
  const config = [
    'fail', 'location', 'silent', 'show-error',
    'connect-timeout = 10', 'max-time = 30',
    `header = "Authorization: Bearer ${escapeCurl(token)}"`,
    'header = "Accept: application/vnd.github+json"',
    'header = "X-GitHub-Api-Version: 2022-11-28"',
    'header = "User-Agent: risck-comply-provider-evidence-fetcher"',
    `output = "${escapeCurl(output)}"`,
    `url = "https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip"`,
  ].join('\n');
  const result = spawnSync('curl', ['--config', '-'], {
    input: `${config}\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractEvidence(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n').map((entry) => entry.trim()).filter(Boolean);
  const matches = entries.filter((entry) => entry.endsWith('production-secrets-provider-stores.json'));
  if (matches.length !== 1) throw new Error('provider_evidence_missing_or_ambiguous');
  return JSON.parse(execFileSync('unzip', ['-p', zipPath, matches[0]], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  }));
}

export async function fetchProductionProviderRuntimeEvidence({ root, repository, token, targetSha, sourceRunId = '', required = false }) {
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  let runs;
  if (sourceRunId) {
    runs = [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)];
  } else {
    const response = await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&head_sha=${encodeURIComponent(targetSha)}&per_page=20`, token);
    runs = response.workflow_runs;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_provider_run_missing');
    console.log(`Production provider evidence remains open: no successful exact-SHA run for ${targetSha}.`);
    return { found: false, targetSha };
  }

  const runId = String(run.id || '');
  if (!NUMERIC_ID.test(runId)) throw new Error('provider_workflow_run_id_invalid');
  const artifacts = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts`, token);
  const expectedName = `production-provider-runtime-proof-${targetSha}`;
  const matching = (artifacts.artifacts ?? []).filter((candidate) => candidate?.name === expectedName && candidate?.expired !== true);
  if (matching.length !== 1 || !NUMERIC_ID.test(String(matching[0]?.id || ''))) {
    throw new Error('exact_sha_provider_artifact_missing_or_ambiguous');
  }

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `provider-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    downloadArtifact(repository, token, String(matching[0].id), zipPath);
    const evidence = extractEvidence(zipPath);
    const validation = validateDownloadedEvidence(evidence, { targetSha, repository });
    if (!validation.passed) throw new Error(`provider_evidence_invalid:${validation.failures.join('|')}`);

    const output = join(root, EVIDENCE_PATH);
    mkdirSync(dirname(output), { recursive: true });
    rmSync(output, { force: true });
    writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA production provider evidence from workflow run ${runId}.`);
    return { found: true, targetSha, runId, artifactId: String(matching[0].id) };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchProductionProviderRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: String(process.env.PRODUCTION_PROVIDER_RUNTIME_SOURCE_RUN_ID || '').trim(),
    required: process.env.PRODUCTION_PROVIDER_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`Production provider evidence retrieval failed: ${error instanceof Error ? error.message.split(':')[0] : 'unknown_error'}`);
    process.exit(1);
  });
}
