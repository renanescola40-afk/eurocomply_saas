#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import {
  ALLOWED_RUNTIME_WORKFLOWS,
  EXPECTED_RUNTIME_LANES,
  resolveLaneInputs,
  validateRuntimeCampaignManifest,
} from '../enterprise/runtime-lane-contracts.mjs';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const releaseSha = (process.env.RELEASE_SHA || '').toLowerCase();
const branch = process.env.RELEASE_BRANCH || 'main';
const recoveryRollbackConfirmation = String(process.env.RECOVERY_ROLLBACK_CONFIRMATION || '').trim();
const manifestPath = process.env.RUNTIME_CAMPAIGN_MANIFEST || 'docs/security/evidence/enterprise-runtime-campaign-manifest.json';
const outputPath = process.env.RUNTIME_CAMPAIGN_OUTPUT || 'artifacts/enterprise-runtime-campaign.json';
const artifactsDir = process.env.RUNTIME_CAMPAIGN_ARTIFACTS_DIR || 'artifacts/runtime-evidence';
const githubApiOrigin = 'https://api.github.com';
const maximumArtifactBytes = 100 * 1024 * 1024;
const maximumArtifactCount = 10;
const maximumArchiveEntries = 2_000;
const maximumExpandedBytes = 250 * 1024 * 1024;
const allowedArtifactHostSuffixes = [
  '.blob.core.windows.net',
  '.githubusercontent.com',
  '.amazonaws.com',
];

if (!token || !repository) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY has an invalid format');
if (!/^[a-f0-9]{40}$/.test(releaseSha)) throw new Error('RELEASE_SHA must be a lowercase full 40-character SHA');
if (branch !== 'main') throw new Error('Enterprise runtime campaigns are restricted to main');
if (recoveryRollbackConfirmation !== 'EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK') {
  throw new Error('RECOVERY_ROLLBACK_CONFIRMATION must explicitly authorize the controlled rollback exercise');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
validateRuntimeCampaignManifest(manifest);

const pollMs = Number(manifest.poll_interval_seconds || 20) * 1000;
const timeoutMs = Number(manifest.timeout_minutes_per_workflow || 60) * 60 * 1000;
if (!Number.isFinite(pollMs) || pollMs < 5_000 || pollMs > 300_000) throw new Error('Invalid campaign polling interval');
if (!Number.isFinite(timeoutMs) || timeoutMs < 60_000 || timeoutMs > 4 * 60 * 60 * 1000) throw new Error('Invalid per-workflow timeout');
const startedAt = new Date();

function githubApiUrl(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('..')) {
    throw new Error('Unsafe GitHub API path');
  }
  const url = new URL(pathname, githubApiOrigin);
  if (url.origin !== githubApiOrigin || url.protocol !== 'https:') throw new Error('Unsafe GitHub API destination');
  return url;
}

function githubHeaders(accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function githubRequest(pathname, init = {}) {
  const url = githubApiUrl(pathname);
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    headers: {
      ...githubHeaders(),
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response;
}

function assertTrustedArtifactResponse(response) {
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:') throw new Error('Artifact download did not use HTTPS');
  const trustedHost = finalUrl.origin === githubApiOrigin
    || allowedArtifactHostSuffixes.some((suffix) => finalUrl.hostname.endsWith(suffix));
  if (!trustedHost) throw new Error('Artifact download redirected to an untrusted host');
}

async function githubArtifactRequest(artifactId) {
  if (!Number.isSafeInteger(artifactId) || artifactId <= 0) throw new Error('Invalid artifact ID');
  const url = githubApiUrl(`/repos/${repository}/actions/artifacts/${artifactId}/zip`);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: githubHeaders('application/octet-stream'),
  });
  assertTrustedArtifactResponse(response);
  if (!response.ok) throw new Error(`Artifact download failed with ${response.status}`);
  return response;
}

async function apiJson(pathname, init = {}) {
  const response = await githubRequest(pathname, init);
  if (response.status === 204) return null;
  return response.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyExactMain() {
  const commit = await apiJson(`/repos/${repository}/commits/main`);
  if (!/^[a-f0-9]{40}$/i.test(commit?.sha || '') || commit.sha.toLowerCase() !== releaseSha) {
    throw new Error('Requested release SHA is not the current main commit');
  }
}

async function dispatchWorkflow(lane) {
  if (!ALLOWED_RUNTIME_WORKFLOWS.has(lane.workflow)) throw new Error('Workflow is not allowlisted');
  const inputs = resolveLaneInputs(lane.inputs, { releaseSha, recoveryRollbackConfirmation });
  await apiJson(`/repos/${repository}/actions/workflows/${lane.workflow}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs }),
  });
}

async function findRun(workflow, notBefore) {
  if (!ALLOWED_RUNTIME_WORKFLOWS.has(workflow)) throw new Error('Workflow is not allowlisted');
  const data = await apiJson(`/repos/${repository}/actions/workflows/${workflow}/runs?event=workflow_dispatch&branch=main&per_page=20`);
  return data.workflow_runs.find((run) =>
    Number.isSafeInteger(run.id)
    && run.head_sha?.toLowerCase() === releaseSha
    && new Date(run.created_at).getTime() >= notBefore - 5000,
  );
}

async function waitForRun(workflow, notBefore) {
  const deadline = Date.now() + timeoutMs;
  let run;
  while (Date.now() < deadline) {
    run = await findRun(workflow, notBefore);
    if (run?.status === 'completed') return run;
    await sleep(pollMs);
  }
  throw new Error(`Timed out waiting for allowlisted workflow ${workflow}`);
}

const safeZipExtractor = String.raw`
import io
import pathlib
import shutil
import stat
import sys
import zipfile

destination = pathlib.Path(sys.argv[1]).resolve()
maximum_entries = int(sys.argv[2])
maximum_expanded = int(sys.argv[3])
archive = sys.stdin.buffer.read()

with zipfile.ZipFile(io.BytesIO(archive)) as package:
    entries = package.infolist()
    if not entries or len(entries) > maximum_entries:
        raise SystemExit('invalid archive entry count')
    expanded = sum(entry.file_size for entry in entries)
    if expanded <= 0 or expanded > maximum_expanded:
        raise SystemExit('invalid expanded archive size')
    destination.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        name = entry.filename
        if not name or '\x00' in name or '\\' in name:
            raise SystemExit('unsafe archive path')
        mode = entry.external_attr >> 16
        if stat.S_ISLNK(mode):
            raise SystemExit('symlink entries are forbidden')
        target = (destination / name).resolve()
        if target != destination and destination not in target.parents:
            raise SystemExit('archive path traversal')
        if entry.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with package.open(entry) as source, open(target, 'xb') as output:
            shutil.copyfileobj(source, output, length=1024 * 1024)
print(len(entries))
`;

function extractValidatedArchive(archive, destination) {
  const extraction = spawnSync(
    'python3',
    ['-c', safeZipExtractor, destination, String(maximumArchiveEntries), String(maximumExpandedBytes)],
    { input: archive, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  );
  if (extraction.status !== 0) throw new Error('Unable to validate and extract artifact archive');
  const entryCount = Number(extraction.stdout.trim());
  if (!Number.isSafeInteger(entryCount) || entryCount <= 0 || entryCount > maximumArchiveEntries) {
    throw new Error('Artifact extractor returned an invalid entry count');
  }
  return entryCount;
}

async function downloadArtifacts(runId, destination, artifactPrefix) {
  if (!Number.isSafeInteger(runId) || runId <= 0) throw new Error('Invalid workflow run ID');
  if (!/^[A-Za-z0-9_.-]{6,100}$/.test(artifactPrefix)) throw new Error('Invalid artifact prefix');
  const data = await apiJson(`/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`);
  const matching = data.artifacts.filter((entry) => !entry.expired && String(entry.name || '').startsWith(artifactPrefix));
  if (matching.length === 0 || matching.length > maximumArtifactCount) throw new Error('Required prefixed artifact inventory is invalid');
  await mkdir(destination, { recursive: true });
  const downloaded = [];
  for (const artifact of matching) {
    if (!Number.isSafeInteger(artifact.id) || artifact.id <= 0) throw new Error('Invalid artifact ID');
    if (!Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes <= 0 || artifact.size_in_bytes > maximumArtifactBytes) {
      throw new Error('Artifact size is outside the accepted boundary');
    }
    const response = await githubArtifactRequest(artifact.id);
    const contentLength = Number(response.headers.get('content-length') || artifact.size_in_bytes);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > maximumArtifactBytes) {
      throw new Error('Artifact response size is outside the accepted boundary');
    }
    const archive = Buffer.from(await response.arrayBuffer());
    if (archive.length === 0 || archive.length > maximumArtifactBytes) throw new Error('Artifact archive size is invalid');
    const entryCount = extractValidatedArchive(archive, destination);
    downloaded.push({ artifact_id: artifact.id, artifact_name: artifact.name, size_in_bytes: artifact.size_in_bytes, entry_count: entryCount });
  }
  return downloaded;
}

await verifyExactMain();
await mkdir(path.dirname(outputPath), { recursive: true });

const results = [];
for (const lane of manifest.workflows) {
  const dispatchedAt = Date.now();
  const result = {
    id: lane.id,
    workflow: lane.workflow,
    required: lane.required === true,
    status: 'blocked',
    conclusion: null,
    run_id: null,
    artifact_count: 0,
    artifact_names: [],
    reason: null,
  };
  try {
    await dispatchWorkflow(lane);
    const run = await waitForRun(lane.workflow, dispatchedAt);
    result.run_id = run.id;
    result.conclusion = run.conclusion;
    result.status = run.conclusion === 'success' ? 'complete' : 'blocked';
    if (run.conclusion !== 'success') result.reason = `workflow_${run.conclusion || 'unknown'}`;
    const laneDir = path.join(artifactsDir, lane.id.toLowerCase());
    const artifacts = await downloadArtifacts(run.id, laneDir, lane.artifact_prefix);
    result.artifact_count = artifacts.length;
    result.artifact_names = artifacts.map((artifact) => artifact.artifact_name).sort();
    if (result.status === 'complete' && artifacts.length === 0) {
      result.status = 'blocked';
      result.reason = 'missing_artifact';
    }
  } catch (error) {
    result.status = 'blocked';
    const message = error instanceof Error ? error.message : 'unknown_error';
    result.reason = message.replaceAll(token, '[REDACTED]').slice(0, 240);
  }
  results.push(result);
  await writeFile(outputPath, JSON.stringify({
    schema_version: 2,
    release_sha: releaseSha,
    release_branch: branch,
    started_at: startedAt.toISOString(),
    updated_at: new Date().toISOString(),
    decision: 'NO_GO',
    results,
  }, null, 2));
}

const required = results.filter((result) => result.required);
const decision = required.every((result) => result.status === 'complete') ? 'READY_FOR_EVIDENCE_PROMOTION' : 'NO_GO';
const summary = {
  schema_version: 2,
  release_sha: releaseSha,
  release_branch: branch,
  started_at: startedAt.toISOString(),
  completed_at: new Date().toISOString(),
  decision,
  counts: {
    total: results.length,
    complete: results.filter((result) => result.status === 'complete').length,
    blocked: results.filter((result) => result.status !== 'complete').length,
  },
  expected_lanes: EXPECTED_RUNTIME_LANES,
  results,
};
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary.counts));
if (decision !== 'READY_FOR_EVIDENCE_PROMOTION') process.exitCode = 1;
