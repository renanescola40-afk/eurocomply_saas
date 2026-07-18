#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_FILE = 'production-runtime-proof.yml';
const WORKFLOW_NAME = 'Production Runtime Proof';
const SOURCE_PATH = 'docs/security/evidence/runtime/production-runtime-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC = /^\d+$/;

function headers(token) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'risck-comply-production-runtime-fetcher' };
}

async function githubJson(url, token) {
  const response = await fetch(url, { headers: headers(token), cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`github_api_${response.status}`);
  return response.json();
}

export function selectExactShaRun(runs, targetSha, sourceRunId = '') {
  const requested = String(sourceRunId || '').trim();
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.name === WORKFLOW_NAME)
    .filter((run) => String(run?.head_sha || '').toLowerCase() === targetSha)
    .filter((run) => run?.head_branch === 'main')
    .filter((run) => run?.status === 'completed' && run?.conclusion === 'success')
    .filter((run) => !requested || String(run?.id) === requested)
    .sort((a, b) => Date.parse(b?.updated_at || 0) - Date.parse(a?.updated_at || 0))[0] ?? null;
}

export function validateDownloadedEvidence(evidence, { targetSha }) {
  const failures = [];
  if (evidence?.schema !== 'risck-comply.production-runtime-scorecard-evidence.v1') failures.push('schema_invalid');
  if (evidence?.evidenceItem !== 'production-runtime-validation') failures.push('evidence_item_invalid');
  if (evidence?.status !== 'Complete' || evidence?.outcome !== 'passed') failures.push('evidence_not_complete');
  if (evidence?.repository !== REPOSITORY || evidence?.branch !== 'main') failures.push('provenance_invalid');
  if (evidence?.targetSha !== targetSha) failures.push('sha_mismatch');
  if (evidence?.targetHost !== 'risckcomply.com') failures.push('host_invalid');
  if (!Array.isArray(evidence?.checks) || evidence.checks.length !== 5 || evidence.checks.some((check) => check?.passed !== true)) failures.push('checks_incomplete');
  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) failures.push('failures_present');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false || evidence?.evidenceIntegrity?.exactShaBound !== true) failures.push('integrity_invalid');
  return { passed: failures.length === 0, failures };
}

function download(repository, token, artifactId, path) {
  const result = spawnSync('curl', ['-fL', '-H', `Authorization: Bearer ${token}`, '-H', 'Accept: application/vnd.github+json', '-o', path, `https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip`], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('artifact_download_failed');
}

function extract(zipPath) {
  const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).split('\n').map((v) => v.trim()).filter(Boolean);
  const entry = entries.find((candidate) => candidate.endsWith(SOURCE_PATH));
  if (!entry) throw new Error('source_evidence_missing');
  return JSON.parse(execFileSync('unzip', ['-p', zipPath, entry], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
}

export async function fetchProductionRuntimeEvidence({ root, repository, token, targetSha, sourceRunId = '', required = false }) {
  const output = join(root, SOURCE_PATH);
  rmSync(output, { force: true });
  if (repository !== REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(targetSha)) throw new Error('target_sha_invalid');

  const runs = sourceRunId
    ? [await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${sourceRunId}`, token)]
    : (await githubJson(`https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&branch=main&per_page=100`, token)).workflow_runs;
  const run = selectExactShaRun(runs, targetSha, sourceRunId);
  if (!run) {
    if (required) throw new Error('exact_sha_runtime_run_missing');
    console.log(`Production runtime evidence remains NOT_VERIFIED for ${targetSha}.`);
    return { found: false, targetSha };
  }
  const runId = String(run.id || '');
  if (!NUMERIC.test(runId)) throw new Error('run_id_invalid');
  const artifacts = await githubJson(`https://api.github.com/repos/${repository}/actions/runs/${runId}/artifacts`, token);
  const expectedName = `production-runtime-proof-${targetSha}`;
  const artifact = (artifacts.artifacts || []).find((item) => item?.name === expectedName && item?.expired !== true);
  if (!artifact || !NUMERIC.test(String(artifact.id || ''))) throw new Error('artifact_missing');

  const zipPath = join(root, 'artifacts', 'enterprise-readiness', `production-runtime-${runId}.zip`);
  mkdirSync(dirname(zipPath), { recursive: true });
  try {
    download(repository, token, String(artifact.id), zipPath);
    const evidence = extract(zipPath);
    const validation = validateDownloadedEvidence(evidence, { targetSha });
    if (!validation.passed) throw new Error(`runtime_evidence_invalid:${validation.failures.join(',')}`);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    console.log(`Retrieved exact-SHA production runtime evidence from workflow run ${runId}.`);
    return { found: true, runId, targetSha };
  } finally {
    rmSync(zipPath, { force: true });
  }
}

async function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  await fetchProductionRuntimeEvidence({ root, repository: process.env.GITHUB_REPOSITORY || '', token: process.env.GITHUB_TOKEN || '', targetSha: String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').toLowerCase(), sourceRunId: process.env.PRODUCTION_RUNTIME_SOURCE_RUN_ID || '', required: process.env.PRODUCTION_RUNTIME_EVIDENCE_REQUIRED === 'true' });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) run().catch((error) => { console.error(error instanceof Error ? error.message.split(':')[0] : 'unknown_error'); process.exit(1); });
