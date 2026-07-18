#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_REPOSITORY,
  WORKFLOW_NAME,
  validateSupabaseRlsRuntimeEvidence,
} from '../security/check-supabase-rls-runtime-evidence.mjs';

const WORKFLOW_FILE = 'supabase-live-rls-validation.yml';
const SOURCE_EVIDENCE_PATH = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const SCORECARD_EVIDENCE_PATH = 'docs/security/evidence/runtime/supabase-rls-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'risck-comply-supabase-rls-evidence-fetcher',
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: apiHeaders(token),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const normalizedRunId = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !normalizedRunId || String(run?.id) === normalizedRunId)
    .sort((left, right) => Date.parse(right?.updated_at || right?.created_at || 0) - Date.parse(left?.updated_at || left?.created_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha, repository, runId }) {
  return validateSupabaseRlsRuntimeEvidence(evidence, {
    expectedSha: targetSha,
    repository,
    runId,
  });
}

function escapeCurlConfigValue(value) {
  return String(value)
    .replace(/[\r\n]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function downloadArtifact(repository, token, artifactId, targetPath) {
  const normalizedArtifactId = String(artifactId || '').trim();
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!NUMERIC_ID.test(normalizedArtifactId)) throw new Error('artifact_id_invalid');

  const url = `https://api.github.com/repos/${repository}/actions/artifacts/${normalizedArtifactId}/zip`;
  const curlConfig = [
    'fail',
    'location',
    'silent',
    'show-error',
    'connect-timeout = 10',
    'max-time = 30',
    `header = "Authorization: Bearer ${escapeCurlConfigValue(token)}"`,
    'header = "Accept: application/vnd.github+json"',
    'header = "X-GitHub-Api-Version: 2022-11-28"',
    'header = "User-Agent: risck-comply-supabase-rls-evidence-fetcher"',
    `output = "${escapeCurlConfigValue(targetPath)}"`,
    `url = "${escapeCurlConfigValue(url)}"`,
  ].join('\n');

  const result = spawnSync('curl', ['--config', '-'], {
    input: `${curlConfig}\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extractSourceEvidence(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const entry = entries.find((candidate) => candidate.endsWith(SOURCE_EVIDENCE_PATH))
    ?? entries.find((candidate) => candidate.endsWith('supabase-live-rls-validation.json'));
  if (!entry) throw new Error('source_evidence_missing_from_artifact');
  return JSON.parse(execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  }));
}

function removeStaleEvidence(root) {
  rmSync(join(root, SOURCE_EVIDENCE_PATH), { force: true });
  rmSync(join(root, SCORECARD_EVIDENCE_PATH), { force: true });
}

export async function fetchSupabaseRlsEvidence({
  root,
  repository,
  token,
  targetSha,
  sourceRunId = '',
  required = false,
}) {
  removeStaleEvidence(root);
  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  let runs;
  if (sourceRunId) {
    runs = [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)];
  } else {
    const response = await githubJson(
      `https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&per_page=100`,
      token,
    );
    runs = response.workflow_runs;
  }

  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_runtime_run_missing');
    console.log(`Supabase RLS evidence remains open: no successful exact-SHA runtime run for ${targetSha}.`);
    return { found: false, targetSha };
  }
  if (run.name !== WORKFLOW_NAME) throw new Error('runtime_workflow_name_invalid');

  const normalizedRunId = String(run.id || '').trim();
  if (!NUMERIC_ID.test(normalizedRunId)) throw new Error('runtime_workflow_run_id_invalid');
  const artifactsResponse = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${normalizedRunId}/artifacts`,
    token,
  );
  const expectedName = `supabase-live-rls-runtime-proof-${targetSha}`;
  const artifact = (artifactsResponse.artifacts ?? [])
    .filter((candidate) => candidate?.name === expectedName && candidate?.expired !== true)
    .sort((left, right) => Date.parse(right?.updated_at || 0) - Date.parse(left?.updated_at || 0))[0];
  if (!artifact) throw new Error('exact_sha_runtime_artifact_missing');

  const normalizedArtifactId = String(artifact.id || '').trim();
  if (!NUMERIC_ID.test(normalizedArtifactId)) throw new Error('artifact_id_invalid');
  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `supabase-rls-runtime-${normalizedRunId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });

  try {
    downloadArtifact(repository, token, normalizedArtifactId, zipPath);
    const evidence = extractSourceEvidence(zipPath);
    const validation = validateDownloadedEvidence(evidence, {
      targetSha,
      repository,
      runId: normalizedRunId,
    });
    if (!validation.passed) throw new Error(`runtime_evidence_invalid:${validation.failures.join(',')}`);

    const output = join(root, SOURCE_EVIDENCE_PATH);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA Supabase RLS evidence from workflow run ${normalizedRunId}.`);
    return { found: true, targetSha, runId: normalizedRunId, artifactId: normalizedArtifactId };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchSupabaseRlsEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    sourceRunId: String(process.env.SUPABASE_RLS_RUNTIME_SOURCE_RUN_ID || '').trim(),
    required: process.env.SUPABASE_RLS_RUNTIME_EVIDENCE_REQUIRED === 'true',
  });
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    const reason = error instanceof Error ? error.message.split(':')[0] : 'unknown_error';
    console.error(`Supabase RLS evidence retrieval failed: ${reason}`);
    process.exit(1);
  });
}
